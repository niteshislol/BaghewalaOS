"""
Optimisation and closed-loop control.

Two very different problems, so two different methods:

CSS cycle design  - slow, offline, six coupled decision variables with a
                    non-convex economic surface. Solved by global search
                    (differential evolution) over the ML surrogate, then the
                    best few candidates are re-run through the full physics
                    twin so nothing is recommended on the surrogate's word
                    alone.

SRP operation     - fast, online, one dominant decision variable (SPM) with
                    two hard constraints (barrel fillage and rod float). Solved
                    directly against the rod model every control interval. No
                    learned model is used here on purpose: the constraint is a
                    force balance, and a force balance should be computed, not
                    predicted.
"""
from __future__ import annotations

import math
import os

import numpy as np
from joblib import load
from scipy.optimize import differential_evolution

from ..physics.nodal import solve_operating_point
from ..physics.srp import SRPOperatingPoint
from ..physics.wellbore import effective_drag_viscosity, mixture_density
from ..twin.simulator import CSSDigitalTwin, CSSParams, SRPParams
from .train import CSS_FEATURES, CSS_TARGETS, MODEL_DIR

DAY = 86400.0


# ============================================================================
# CSS cycle optimiser
# ============================================================================
class CSSSurrogate:
    """Fast stand-in for a full twin cycle."""

    def __init__(self, path=None):
        path = path or os.path.join(MODEL_DIR, "css_surrogate.joblib")
        blob = load(path)
        self.models = blob["models"]
        self.features = blob["features"]
        self.targets = blob["targets"]

    def predict(self, rows):
        x = np.asarray(rows, dtype=float)
        out = np.column_stack([m.predict(x) for m in self.models])
        return out

    def predict_one(self, feature_dict):
        row = [[feature_dict[f] for f in self.features]]
        vals = self.predict(row)[0]
        return dict(zip(self.targets, [float(v) for v in vals]))


CSS_BOUNDS = {
    "steam_tonnes": (300.0, 2500.0),
    "injection_rate_tpd": (80.0, 250.0),
    "injection_pressure_kpa": (4800.0, 10000.0),
    "steam_quality": (0.60, 0.95),
    "soak_days": (1.0, 15.0),
    "cutoff_rate_bopd": (1.5, 6.0),
}
CSS_VARS = list(CSS_BOUNDS.keys())


def optimize_css(twin, objective="net", max_sor=None, min_oil=None,
                 bounds=None, popsize=18, maxiter=45, seed=3,
                 verify_top=3, surrogate=None):
    """Search CSS cycle parameters for the next cycle.

    ``objective`` is one of ``net`` (rupees per cycle), ``oil`` (barrels) or
    ``sor`` (minimise steam-oil ratio). Constraints are applied as penalties so
    the search stays smooth.
    """
    sg = surrogate or CSSSurrogate()
    b = dict(CSS_BOUNDS)
    if bounds:
        b.update(bounds)
    lo = [b[v][0] for v in CSS_VARS]
    hi = [b[v][1] for v in CSS_VARS]

    static = {
        "spm": twin.srp.spm,
        "perm_md": twin.cfg.perm_md,
        "pay_thickness_m": twin.cfg.pay_thickness_m,
        "porosity": twin.cfg.porosity,
        "skin": twin.cfg.skin,
        "p_res_kpa": twin.res.p_res,
        "t_res_c": twin.cfg.t_res_c,
        "mu_res_cp": twin.visc.mu_oil(twin.cfg.t_res_c),
        "cycle_number": max(twin.cycle, 1),
    }

    n_vars = len(CSS_VARS)

    def rows_from(pop):
        out = []
        for p in pop:
            d = dict(zip(CSS_VARS, p))
            d.update(static)
            out.append([d[f] for f in CSS_FEATURES])
        return out

    def score(pop):
        # scipy calls a vectorized objective with shape (n_params, S) during
        # the population sweep and with a plain (n_params,) vector during the
        # final polish, so normalise both to a (S, n_params) batch.
        arr = np.atleast_2d(np.asarray(pop, dtype=float))
        scalar = arr.shape[0] == 1 and np.ndim(pop) == 1
        if arr.shape[0] == n_vars and arr.shape[1] != n_vars:
            arr = arr.T
        pred = sg.predict(rows_from(arr))
        oil = pred[:, CSS_TARGETS.index("oil_bbl")]
        sor = pred[:, CSS_TARGETS.index("sor_bbl_per_bbl")]
        net = pred[:, CSS_TARGETS.index("net_inr")]
        if objective == "oil":
            val = oil / 1000.0
        elif objective == "sor":
            val = -sor
        else:
            val = net / 1e5
        pen = np.zeros_like(val)
        if max_sor is not None:
            pen += 12.0 * np.maximum(sor - max_sor, 0.0)
        if min_oil is not None:
            pen += 12.0 * np.maximum(min_oil - oil, 0.0) / 100.0
        out = -(val - pen)
        return float(out[0]) if scalar else out

    result = differential_evolution(
        score, bounds=list(zip(lo, hi)), popsize=popsize, maxiter=maxiter,
        seed=seed, tol=1e-6, polish=True, vectorized=True, init="sobol",
    )

    best = dict(zip(CSS_VARS, [float(v) for v in result.x]))
    candidates = [best]
    # a couple of nearby points, verified with the real physics
    rng = np.random.default_rng(seed)
    for _ in range(max(verify_top - 1, 0)):
        jitter = {k: float(np.clip(v * (1 + rng.normal(0, 0.08)),
                                   b[k][0], b[k][1]))
                  for k, v in best.items()}
        candidates.append(jitter)

    verified = []
    for cand in candidates:
        verified.append({"params": cand,
                         "surrogate": sg.predict_one({**cand, **static}),
                         "physics": verify_css(twin, cand)})
    key = {"net": "net_inr", "oil": "oil_bbl", "sor": "sor_bbl_per_bbl"}[objective]
    sign = -1 if objective == "sor" else 1
    verified.sort(key=lambda v: sign * v["physics"].get(key, 0.0), reverse=True)

    return {
        "objective": objective,
        "best": verified[0],
        "candidates": verified,
        "iterations": int(result.nit),
        "surrogate_only_optimum": sg.predict_one({**best, **static}),
    }


def verify_css(twin, params, dt_days=0.5, controller=None):
    """Re-run one cycle of the FULL physics twin with the proposed settings."""
    import copy

    clone = CSSDigitalTwin(
        config=copy.deepcopy(twin.cfg),
        css=CSSParams(
            steam_tonnes=params["steam_tonnes"],
            injection_rate_tpd=params["injection_rate_tpd"],
            injection_pressure_kpa=params["injection_pressure_kpa"],
            steam_quality=params["steam_quality"],
            soak_days=params["soak_days"],
            cutoff_rate_bopd=params["cutoff_rate_bopd"],
        ),
        srp=SRPParams(spm=twin.srp.spm),
        econ=copy.deepcopy(twin.econ),
    )
    clone.res.p_res = twin.res.p_res
    clone.run_cycles(1, dt_days=dt_days, controller=controller)
    return clone.cycle_summaries[-1] if clone.cycle_summaries else {}


# ============================================================================
# SRP real-time controller
# ============================================================================
class SRPController:
    """Continuously retunes the beam unit from the live well condition.

    Objective: move every barrel the reservoir can deliver, without letting the
    rod string float and without pounding a half-empty barrel.

        SPM* = min( SPM that fills the barrel to target,
                    SPM that keeps the float margin )

    Both terms are computed, not learned. The first comes from the nodal
    balance, the second by bisecting the rod force balance.
    """

    def __init__(self, target_fillage=0.92, float_margin=0.18,
                 max_step=0.6, min_spm=1.0, max_spm=8.0,
                 allow_vfd=True, gearbox_limit_pct=92.0):
        self.target_fillage = target_fillage
        self.float_margin = float_margin
        self.max_step = max_step
        self.min_spm = min_spm
        self.max_spm = max_spm
        self.allow_vfd = allow_vfd
        self.gearbox_limit_pct = gearbox_limit_pct
        self.last_action = None

    # ------------------------------------------------------------------
    def _evaluate(self, twin, spm, downstroke_ratio=1.0, upstroke_ratio=None):
        """Rod-model KPIs for a trial SPM at the twin's current state."""
        t_zone = twin.zone.temperature
        rho_oil = twin.visc.density(t_zone)
        stroke_eff = twin.unit.stroke * 0.96
        q_cap = twin.pump.area * stroke_eff * spm * 1440.0
        op = solve_operating_point(twin.res, twin.wb_press, twin.zone.radius,
                                   t_zone, q_cap, rho_oil)
        rho_mix = mixture_density(op["water_cut"], rho_oil, t_zone)
        mass_rate = op["q_liquid_m3d"] * rho_mix / DAY
        mu_drag = effective_drag_viscosity(twin.rods, twin.wb_thermal,
                                           twin.visc, t_zone, mass_rate,
                                           twin.tubing_id_m)
        p_dis = twin.wb_press.discharge_pressure(rho_mix)
        if upstroke_ratio is None:
            # speed the upstroke up to claw back the strokes/min the slower
            # downstroke costs, within what the prime mover will allow
            upstroke_ratio = 1.0 if downstroke_ratio >= 0.999 else min(
                1.6, 1.0 / max(2.0 - 1.0 / downstroke_ratio, 0.55))
        point = SRPOperatingPoint(twin.unit, twin.rods, twin.pump, spm,
                                  tubing_id_in=twin.cfg.tubing_id_in,
                                  downstroke_ratio=downstroke_ratio,
                                  upstroke_ratio=upstroke_ratio)
        card = point.solve(mu_drag, rho_mix, p_dis, op["p_intake_kpa"],
                           fillage=op["fillage"], n_points=48)
        return op, card

    # ------------------------------------------------------------------
    def recommend(self, twin):
        """Return the SPM (and VFD profile) the unit should be running at."""
        current = twin.srp.spm

        # --- 1. inflow-limited SPM: fill the barrel to target ---------------
        op_now, card_now = self._evaluate(twin, current)
        q_available = op_now["q_liquid_m3d"] if op_now["pumped_off"] else None
        if q_available is None:
            # pump-limited: the reservoir has more to give, so we may speed up
            spm_inflow = self.max_spm
        else:
            per_spm = twin.pump.area * twin.unit.stroke * 0.96 * 1440.0
            spm_inflow = q_available / max(per_spm * self.target_fillage, 1e-9)

        # --- 2. float-limited SPM: bisect the force balance -----------------
        def float_ok(spm, ratio=1.0):
            _, c = self._evaluate(twin, spm, ratio)
            return (c["rod_float_index"] >= self.float_margin
                    and c["gearbox_load_pct"] <= self.gearbox_limit_pct)

        lo, hi = self.min_spm, self.max_spm
        if float_ok(hi):
            spm_float = hi
        elif not float_ok(lo):
            spm_float = lo
        else:
            for _ in range(14):
                mid = 0.5 * (lo + hi)
                if float_ok(mid):
                    lo = mid
                else:
                    hi = mid
            spm_float = lo

        target = min(spm_inflow, spm_float)

        # --- 2b. below the unit's minimum speed -> pump-off control ---------
        # A beam unit cannot run arbitrarily slowly. When the reservoir cannot
        # even fill the barrel at minimum SPM, the right answer is not to keep
        # pounding: it is to pump intermittently, letting the well build fluid
        # back over the pump between runs. This is standard practice on weak
        # heavy-oil wells and it removes both the pounding and the wasted power.
        pump_off_control = False
        duty_cycle = 1.0
        if target < self.min_spm:
            pump_off_control = True
            duty_cycle = max(min(target / self.min_spm, 1.0), 0.05)
            target = self.min_spm

        # --- 3. VFD: slow the downstroke instead of losing production -------
        ratio = 1.0
        vfd_used = False
        if self.allow_vfd and spm_float < spm_inflow - 0.15:
            for r in (0.85, 0.7, 0.55, 0.45):
                if float_ok(min(spm_inflow, self.max_spm), r):
                    ratio = r
                    target = min(spm_inflow, self.max_spm)
                    vfd_used = True
                    break

        target = float(np.clip(target, self.min_spm, self.max_spm))
        # rate-limit so the recommendation is implementable on a real VFD
        new_spm = float(np.clip(target, current - self.max_step,
                                current + self.max_step))

        if pump_off_control:
            action = ("switch to intermittent pumping - run %.0f min/h at %.1f spm"
                      % (60.0 * duty_cycle, self.min_spm))
        elif new_spm > current + 0.02:
            action = "increase SPM - reservoir can deliver more"
        elif new_spm < current - 0.02:
            action = ("reduce SPM - rod float risk" if spm_float < spm_inflow
                      else "reduce SPM - barrel not filling")
        else:
            action = "hold"
        if vfd_used:
            action += " (VFD: slow downstroke)"

        self.last_action = action
        return {
            "recommended_spm": round(new_spm, 2),
            "target_spm": round(target, 2),
            "current_spm": round(current, 2),
            "spm_inflow_limit": round(float(spm_inflow), 2),
            "spm_float_limit": round(float(spm_float), 2),
            "downstroke_ratio": ratio,
            "vfd_engaged": vfd_used,
            "pump_off_control": pump_off_control,
            "duty_cycle": round(duty_cycle, 3),
            "runtime_min_per_hour": round(60.0 * duty_cycle, 1),
            "action": action,
            "current_fillage": round(card_now["fillage"], 3),
            "current_float_index": round(card_now["rod_float_index"], 3),
            "current_floating": bool(card_now["rod_floating"]),
            "binding_constraint": ("rod_float" if spm_float < spm_inflow
                                   else "inflow"),
        }

    # ------------------------------------------------------------------
    def __call__(self, twin):
        """Usable directly as the ``controller`` argument of ``run_cycles``."""
        rec = self.recommend(twin)
        twin.srp.spm = rec["recommended_spm"]
        twin.srp.downstroke_speed_ratio = rec["downstroke_ratio"]
        return rec
