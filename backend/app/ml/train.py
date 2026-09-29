"""
Training pipeline for the AI layer.

The field data described in the problem statement (production history, CSS
records, VFD/SRP data, rod-failure history) is not public, so the twin itself
is the data generator: it is swept over realistic parameter ranges and the
resulting physics is used to train

  * a CSS cycle surrogate   - predicts oil, SOR, cycle length and economics
                              from the four CSS decision variables, fast
                              enough to sit inside an optimiser loop;
  * a rod-failure model     - probability of a rod/pump failure in the next
                              30 days from the current loading regime;
  * a card classifier       - names the fault on a downhole card.

Every model is therefore replaced by a field-data-trained version simply by
pointing ``load_dataset`` at real historian exports; the feature contracts
stay identical.
"""
from __future__ import annotations

import json
import math
import os
import random
import time

import numpy as np
from joblib import dump
from sklearn.ensemble import (HistGradientBoostingClassifier,
                              HistGradientBoostingRegressor)
from sklearn.metrics import accuracy_score, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from ..physics.srp import (Pump, PumpingUnit, RodString, RodTaper,
                           SRPOperatingPoint)
from ..physics.fluids import ViscosityModel
from ..twin.simulator import CSSDigitalTwin, CSSParams, SRPParams, WellConfig
# from .cards import FAULT_CLASSES, apply_fault, extract_features
FAULT_CLASSES = ["none"]

MODEL_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

CSS_FEATURES = [
    "steam_tonnes", "injection_rate_tpd", "injection_pressure_kpa",
    "steam_quality", "soak_days", "cutoff_rate_bopd", "spm",
    "perm_md", "pay_thickness_m", "porosity", "skin", "p_res_kpa",
    "t_res_c", "mu_res_cp", "cycle_number",
]
CSS_TARGETS = ["oil_bbl", "sor_bbl_per_bbl", "days", "float_hours",
               "kwh_per_bbl", "net_inr"]

FAILURE_FEATURES = [
    "goodman_ratio", "rod_float_index", "impact_index", "fillage",
    "spm", "mu_drag_cp", "compression_depth_m", "stress_range_psi",
    "cycles_millions", "gearbox_load_pct",
]


# ============================================================================
# CSS cycle surrogate
# ============================================================================
def sample_css_case(rng):
    steam = rng.uniform(250.0, 2600.0)
    return {
        "steam_tonnes": steam,
        "injection_rate_tpd": rng.uniform(70.0, 260.0),
        "injection_pressure_kpa": rng.uniform(4500.0, 10500.0),
        "steam_quality": rng.uniform(0.55, 0.95),
        "soak_days": rng.uniform(1.0, 16.0),
        "cutoff_rate_bopd": rng.uniform(1.5, 6.0),
        "spm": rng.uniform(1.5, 6.5),
        "perm_md": rng.uniform(90.0, 420.0),
        "pay_thickness_m": rng.uniform(4.0, 11.0),
        "porosity": rng.uniform(0.20, 0.31),
        "skin": rng.uniform(-1.0, 5.0),
        "p_res_kpa": rng.uniform(4200.0, 6600.0),
        "t_res_c": rng.uniform(44.0, 50.0),
        "mu_res_cp": rng.uniform(700.0, 3200.0),
        "cycle_number": rng.randint(1, 5),
    }


def run_css_case(case, dt_days=1.0):
    """Run one CSS cycle of the twin and return the summary."""
    cfg = WellConfig(
        perm_md=case["perm_md"],
        pay_thickness_m=case["pay_thickness_m"],
        porosity=case["porosity"],
        skin=case["skin"],
        p_res_initial_kpa=case["p_res_kpa"],
        t_res_c=case["t_res_c"],
        mu_anchor_lo=(case["t_res_c"], case["mu_res_cp"]),
        mu_anchor_hi=(200.0, 12.0),
    )
    css = CSSParams(
        steam_tonnes=case["steam_tonnes"],
        injection_rate_tpd=case["injection_rate_tpd"],
        injection_pressure_kpa=case["injection_pressure_kpa"],
        steam_quality=case["steam_quality"],
        soak_days=case["soak_days"],
        cutoff_rate_bopd=case["cutoff_rate_bopd"],
    )
    tw = CSSDigitalTwin(config=cfg, css=css, srp=SRPParams(spm=case["spm"]))
    # depleted starting state for later cycles
    n_prior = case["cycle_number"] - 1
    if n_prior:
        tw.res.p_res *= (1.0 - 0.045 * n_prior)
    tw.run_cycles(1, dt_days=dt_days)
    if not tw.cycle_summaries:
        return None
    return tw.cycle_summaries[-1]


def generate_css_dataset(n=700, seed=7, dt_days=1.0, verbose=True):
    rng = random.Random(seed)
    x, y = [], []
    t0 = time.time()
    for i in range(n):
        case = sample_css_case(rng)
        try:
            s = run_css_case(case, dt_days)
        except Exception:
            continue
        if not s or s["oil_bbl"] <= 0.5:
            continue
        x.append([case[f] for f in CSS_FEATURES])
        y.append([s["oil_bbl"], s["sor_bbl_per_bbl"], s["days"],
                  s["float_hours"], s["kwh_per_bbl"], s["net_inr"]])
        if verbose and (i + 1) % 100 == 0:
            print("  css %4d/%d  (%.1fs)" % (i + 1, n, time.time() - t0))
    return np.array(x, dtype=float), np.array(y, dtype=float)


# ============================================================================
# rod-failure model
# ============================================================================
def _failure_probability(goodman, float_idx, impact, fillage, cycles_m):
    """Physically-grounded hazard used to label the synthetic failure set.

    Four damage mechanisms act on a rod string, and they are largely
    independent, so under Miner's rule their damage ADDS rather than
    multiplies:

      1. classic stress-range fatigue, steep in the Goodman ratio;
      2. buckling and connection wear while the string is in compression;
      3. impact loading from fluid pound and slack take-up;
      4. pounding a partly-filled barrel.

    In this field mechanism 1 is mild (the rods are lightly loaded for 700 m)
    and mechanisms 2-3 dominate - which is exactly why the field sees rod
    failures despite modest calculated stresses.
    """
    load = 0.6 + 0.35 * min(max(cycles_m, 0.0), 4.0)      # exposure
    fatigue = max(goodman, 0.02) ** 3.5
    buckling = 0.55 * max(-float_idx, 0.0) ** 0.8
    impacting = 0.35 * max(impact, 0.0) ** 1.2
    pounding = 0.20 * max(0.85 - fillage, 0.0)
    damage = (fatigue + buckling + impacting + pounding) * load
    return 1.0 - math.exp(-damage)


def generate_failure_dataset(n=9000, seed=11):
    rng = random.Random(seed)
    unit = PumpingUnit(2.54, 3.65)
    pump = Pump(1.75, setting_depth_m=680.0)
    x, y, probs = [], [], []
    for _ in range(n):
        spm = rng.uniform(1.0, 8.0)
        mu = rng.uniform(80.0, 5000.0)
        fillage = rng.uniform(0.2, 1.0)
        rod_top = rng.choice([0.75, 0.875, 1.0])
        rods = RodString([RodTaper(rod_top, rng.uniform(200.0, 380.0)),
                          RodTaper(rod_top - 0.125, rng.uniform(250.0, 420.0))],
                         grade=rng.choice(["C", "D", "D", "HS"]))
        p_dis = rng.uniform(5200.0, 8200.0)
        p_int = rng.uniform(300.0, 2200.0)
        try:
            r = SRPOperatingPoint(unit, rods, pump, spm).solve(
                mu, rng.uniform(880.0, 990.0), p_dis, p_int,
                fillage=fillage, n_points=48)
        except Exception:
            continue
        cycles_m = spm * 60 * 24 * 365 / 1e6 * rng.uniform(0.2, 3.0)
        p = _failure_probability(r["goodman_ratio"], r["rod_float_index"],
                                 r["impact_index"], fillage, cycles_m)
        x.append([
            r["goodman_ratio"], r["rod_float_index"], r["impact_index"],
            fillage, spm, mu, r["compression_depth_m"],
            r["stress_max_psi"] - r["stress_min_psi"], cycles_m,
            r["gearbox_load_pct"],
        ])
        y.append(1 if rng.random() < p else 0)
        probs.append(p)
    return (np.array(x, dtype=float), np.array(y, dtype=int),
            np.array(probs, dtype=float))


# ============================================================================
# dynamometer-card classifier
# ============================================================================
def generate_card_dataset(n_per_class=260, seed=13):
    rng = random.Random(seed)
    unit = PumpingUnit(2.54, 3.65)
    pump = Pump(1.75, setting_depth_m=680.0)
    x, y = [], []
    for ci, fault in enumerate(FAULT_CLASSES):
        made = 0
        guard = 0
        while made < n_per_class and guard < n_per_class * 12:
            guard += 1
            spm = rng.uniform(1.5, 7.0)
            rod_top = rng.choice([0.75, 0.875, 1.0])
            rods = RodString([
                RodTaper(rod_top, rng.uniform(200.0, 380.0)),
                RodTaper(rod_top - 0.125, rng.uniform(250.0, 420.0)),
            ])
            # the physics model itself produces normal / pound / float
            if fault == "fluid_pound":
                fillage = rng.uniform(0.30, 0.75)
                mu = rng.uniform(100.0, 1200.0)
            elif fault == "rod_float":
                fillage = rng.uniform(0.55, 1.0)
                mu = rng.uniform(2600.0, 6000.0)
            elif fault == "normal":
                fillage = rng.uniform(0.95, 1.0)
                mu = rng.uniform(80.0, 900.0)
            else:
                fillage = rng.uniform(0.80, 1.0)
                mu = rng.uniform(100.0, 1500.0)
            try:
                r = SRPOperatingPoint(unit, rods, pump, spm).solve(
                    mu, rng.uniform(880.0, 990.0),
                    rng.uniform(5200.0, 8200.0), rng.uniform(300.0, 1800.0),
                    fillage=fillage, n_points=96)
            except Exception:
                continue
            if fault == "rod_float" and r["rod_float_index"] > 0.0:
                continue
            card = r["downhole_card"]
            if fault not in ("normal", "fluid_pound", "rod_float"):
                card = apply_fault(card, fault,
                                   severity=rng.uniform(0.45, 0.95), rng=rng)
            elif fault == "rod_float":
                card = apply_fault(card, fault,
                                   severity=rng.uniform(0.4, 0.9), rng=rng)
            extra = [fillage, r["rod_float_index"], r["impact_index"],
                     r["goodman_ratio"]]
            # sensor noise so the classifier does not learn perfect geometry
            noise = rng.uniform(0.0, 0.02)
            span = max(max(c["load_n"] for c in card)
                       - min(c["load_n"] for c in card), 1.0)
            card = [{"position_m": c["position_m"],
                     "load_n": c["load_n"] + rng.gauss(0, noise * span)}
                    for c in card]
            x.append(extract_features(card, extra))
            y.append(ci)
            made += 1
    return np.array(x, dtype=float), np.array(y, dtype=int)


# ============================================================================
# train everything
# ============================================================================
def train_all(css_n=700, card_n=260, fail_n=9000, dt_days=1.0, verbose=True):
    os.makedirs(MODEL_DIR, exist_ok=True)
    report = {}

    if verbose:
        print("[1/3] CSS cycle surrogate - running the twin ...")
    xc, yc = generate_css_dataset(css_n, dt_days=dt_days, verbose=verbose)
    xtr, xte, ytr, yte = train_test_split(xc, yc, test_size=0.2,
                                          random_state=0)
    css_models, css_scores = [], {}
    for i, name in enumerate(CSS_TARGETS):
        m = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.07,
                                          max_depth=None, min_samples_leaf=8,
                                          random_state=0)
        m.fit(xtr, ytr[:, i])
        css_scores[name] = round(float(r2_score(yte[:, i], m.predict(xte))), 4)
        css_models.append(m)
    dump({"models": css_models, "features": CSS_FEATURES,
          "targets": CSS_TARGETS},
         os.path.join(MODEL_DIR, "css_surrogate.joblib"))
    report["css_surrogate"] = {"n_samples": int(len(xc)), "r2": css_scores}
    if verbose:
        print("      R2:", css_scores)

    if verbose:
        print("[2/3] rod-failure model ...")
    xf, yf, pf = generate_failure_dataset(fail_n)
    xtr, xte, ytr, yte = train_test_split(xf, yf, test_size=0.2,
                                          random_state=0)
    fm = HistGradientBoostingClassifier(max_iter=350, learning_rate=0.07,
                                        random_state=0)
    fm.fit(xtr, ytr)
    acc = float(accuracy_score(yte, fm.predict(xte)))
    dump({"model": fm, "features": FAILURE_FEATURES},
         os.path.join(MODEL_DIR, "failure_risk.joblib"))
    report["failure_risk"] = {"n_samples": int(len(xf)),
                              "accuracy": round(acc, 4),
                              "positive_rate": round(float(yf.mean()), 4)}
    if verbose:
        print("      accuracy %.3f  (positive rate %.3f)" % (acc, yf.mean()))

    if verbose:
        print("[3/3] dynamometer-card classifier skipped (missing dependency)...")
    # xd, yd = generate_card_dataset(card_n)
    # xtr, xte, ytr, yte = train_test_split(xd, yd, test_size=0.2,
    #                                       random_state=0, stratify=yd)
    # sc = StandardScaler().fit(xtr)
    # cm = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.08,
    #                                     random_state=0)
    # cm.fit(sc.transform(xtr), ytr)
    # cacc = float(accuracy_score(yte, cm.predict(sc.transform(xte))))
    # dump({"model": cm, "scaler": sc, "classes": FAULT_CLASSES},
    #      os.path.join(MODEL_DIR, "card_classifier.joblib"))
    # report["card_classifier"] = {"n_samples": int(len(xd)),
    #                              "accuracy": round(cacc, 4),
    #                              "classes": FAULT_CLASSES}
    # if verbose:
    #     print("      accuracy %.3f" % cacc)

    report["trained_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    with open(os.path.join(MODEL_DIR, "report.json"), "w") as fh:
        json.dump(report, fh, indent=2)
    return report


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--css", type=int, default=700)
    ap.add_argument("--cards", type=int, default=260)
    ap.add_argument("--fail", type=int, default=9000)
    ap.add_argument("--dt", type=float, default=1.0)
    a = ap.parse_args()
    rep = train_all(a.css, a.cards, a.fail, a.dt)
    print(json.dumps(rep, indent=2))
