"""Bounded adapter for the WagheraOS ORIGIN ML layer.

Only model inference, feature alignment, explainability metadata, and constrained
candidate scoring are transplanted. The source repository remains independent.
All predictions retain synthetic-demo provenance.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd
from joblib import load

from app.twin.catalog import get_well_meta
from app.twin.compose import compose_twin
from app.schemas.prediction import OperatingParameters

BASE = Path(__file__).resolve().parents[1] / "ml" / "artifacts" / "waghera_origin"
FEATURES = [
    "reservoir_temperature", "reservoir_pressure", "oil_viscosity", "oil_api",
    "water_cut", "steam_volume", "injection_pressure", "injection_duration",
    "soak_time", "stroke_length", "spm", "vfd_setting", "pump_efficiency",
    "rod_load", "sor", "energy_per_barrel", "production_change",
    "temperature_change", "viscosity_change", "rolling_production", "rolling_sor",
]

_PROD = None
_FAIL = None
_METRICS: dict[str, Any] | None = None


def _load():
    global _PROD, _FAIL, _METRICS
    if _PROD is None:
        _PROD = load(BASE / "production_model.joblib")
    if _FAIL is None:
        _FAIL = load(BASE / "failure_model.joblib")
    if _METRICS is None:
        _METRICS = json.loads((BASE / "metrics.json").read_text())
    return _PROD, _FAIL, _METRICS


def metrics() -> dict[str, Any]:
    return _load()[2]


def _current_history_features(twin: dict[str, Any]) -> dict[str, float]:
    sess = twin.get("session") or {}
    history = sess.get("prediction_history") or []
    prev = history[-1] if history else None
    current_oil = float(twin.get("production_rate_bopd", 0.0))
    current_temp = float(twin.get("reservoir_temperature", 0.0))
    current_visc = float(twin.get("in_situ_viscosity", 0.0))
    prev_oil = float(prev.get("predicted_oil", current_oil)) if prev else current_oil
    return {
        "production_change": current_oil - prev_oil,
        "temperature_change": 0.0,
        "viscosity_change": 0.0,
        "rolling_production": current_oil,
        "rolling_sor": float(twin.get("sor", 0.0)),
    }


def feature_row(twin: dict[str, Any], parameters: dict[str, float] | None = None) -> dict[str, float]:
    params = dict(twin.get("parameters") or {})
    if parameters:
        params.update(parameters)
    srp = twin.get("srp") or {}
    meta = get_well_meta(str(twin.get("well_id")))
    api = meta.fingerprint.api_gravity if meta else 18.0
    viscosity = float(twin.get("in_situ_viscosity", 500.0))
    spm = float(params.get("spm", twin.get("spm", 5.5)))
    stroke = float(params.get("stroke_length", 2.4))
    # Match the feature semantics used by ORIGIN's synthetic training generator.
    derived_rod_load = 35.0 + viscosity / 25.0 + spm * 2.5 + stroke * 8.0
    pump_eff = float(srp.get("pump_efficiency", srp.get("pump_condition", 0.75)))
    energy = 120.0 + spm * 8.0 + float(params.get("steam_volume", twin.get("steam_injected", 450.0))) / 15.0
    oil = max(float(twin.get("production_rate_bopd", 1.0)), 1.0)
    return {
        "reservoir_temperature": float(twin.get("reservoir_temperature", 50.0)),
        "reservoir_pressure": float(twin.get("pressure", 12.0)),
        "oil_viscosity": viscosity,
        "oil_api": float(api),
        "water_cut": 15.0,
        "steam_volume": float(params.get("steam_volume", twin.get("steam_injected", 450.0))),
        "injection_pressure": float(params.get("injection_pressure", 7.5)),
        "injection_duration": float(params.get("injection_duration", 72.0)),
        "soak_time": float(params.get("soak_time", 48.0)),
        "stroke_length": stroke,
        "spm": spm,
        "vfd_setting": float(params.get("vfd_setting", 65.0)),
        "pump_efficiency": pump_eff,
        "rod_load": derived_rod_load,
        "sor": float(twin.get("sor", 2.0)),
        "energy_per_barrel": energy / oil,
        **_current_history_features(twin),
    }


def predict(twin: dict[str, Any], parameters: dict[str, float] | None = None) -> dict[str, Any]:
    prod_bundle, fail_bundle, meta = _load()
    row = feature_row(twin, parameters)
    X = pd.DataFrame([{f: row.get(f, 0.0) for f in FEATURES}], columns=FEATURES)
    prod_features = prod_bundle.get("features", FEATURES)
    fail_features = fail_bundle.get("features", FEATURES)
    oil = float(prod_bundle["model"].predict(X.reindex(columns=prod_features, fill_value=0))[0])
    fm = fail_bundle["model"]
    xf = X.reindex(columns=fail_features, fill_value=0)
    if hasattr(fm, "predict_proba"):
        failure = float(fm.predict_proba(xf)[0][1])
    else:
        failure = float(fm.predict(xf)[0])
    return {
        "well_id": twin.get("well_id"),
        "production_bopd": round(max(0.0, oil), 3),
        "failure_probability": round(max(0.0, min(1.0, failure)), 4),
        "models": {
            "production": meta["production"]["selected"],
            "failure": meta["failure"]["selected"],
        },
        "feature_values": row,
        "provenance": "MODEL_PREDICTION",
        "training_data": "synthetic_demo_data_from_WagheraOS",
        "disclaimer": "Cross-check model trained on synthetic demo data; not calibrated to field telemetry.",
    }


def explain(twin: dict[str, Any], parameters: dict[str, float] | None = None) -> dict[str, Any]:
    prod_bundle, fail_bundle, _ = _load()
    row = feature_row(twin, parameters)
    rows = []
    for bundle, task in ((prod_bundle, "production"), (fail_bundle, "failure")):
        model = bundle["model"]
        features = bundle.get("features", FEATURES)
        importances = getattr(model, "feature_importances_", None)
        pairs = [] if importances is None else list(zip(features, importances))
        pairs.sort(key=lambda p: float(p[1]), reverse=True)
        rows.append({
            "task": task,
            "top_features": [
                {"feature": name, "importance": round(float(weight), 5), "value": round(float(row.get(name, 0.0)), 4)}
                for name, weight in pairs[:8]
            ],
        })
    return {
        "well_id": twin.get("well_id"),
        "explanations": rows,
        "method": "tree_feature_importance_with_live_feature_values",
        "provenance": "MODEL_EXPLANATION",
        "disclaimer": "Feature importance is model-level attribution, not causal inference.",
    }


def model_status() -> dict[str, Any]:
    p, f, m = _load()
    return {
        "status": "loaded",
        "production_model": type(p["model"]).__name__,
        "failure_model": type(f["model"]).__name__,
        "features": FEATURES,
        "metrics": m,
        "artifact_dir": str(BASE),
        "source": "WagheraOS",
        "provenance": "SYNTHETIC_DEMO",
    }


CANDIDATE_GRID = {
    "steam_volume": [380.0, 450.0, 520.0, 600.0, 680.0],
    "injection_pressure": [7.2, 8.2, 9.0],
    "injection_duration": [60.0, 72.0, 84.0],
    "soak_time": [36.0, 48.0, 60.0],
    "stroke_length": [2.2, 2.5, 2.8],
    "spm": [4.8, 5.8, 6.6, 7.4],
    "vfd_setting": [55.0, 70.0, 85.0],
}


def _score(ml: dict[str, Any], twin: dict[str, Any]) -> float:
    oil = ml["production_bopd"]
    ml_failure = ml["failure_probability"]
    physics_failure = float(twin.get("failure_probability", 0.0))
    failure = max(ml_failure, physics_failure)
    sor = float(twin.get("sor", 2.0))
    energy = max(0.1, float(twin.get("motor_power_kw", 10.0))) / max(oil, 1.0)
    risk_penalty = max(0.0, failure - 0.35) * 110.0
    return round(oil - 8.0 * sor - 3.0 * energy - risk_penalty, 4)


def origin_optimize(well_id: str, max_candidates: int = 72) -> dict[str, Any]:
    """Constrained grid + Pareto selection using the integrated ORIGIN models.

    The real Baghewala physics twin is evaluated for every selected candidate, while
    the transplanted ORIGIN models provide a learned production/failure cross-check.
    """
    import itertools

    base = compose_twin(well_id)
    keys = list(CANDIDATE_GRID)
    params = base["parameters"]
    all_candidates = []
    for values in itertools.product(*(CANDIDATE_GRID[k] for k in keys)):
        cand = dict(zip(keys, values))
        # Keep search within the bounded demo envelope.
        if cand["steam_volume"] > 600 and cand["spm"] > 7.0:
            continue
        all_candidates.append(cand)
    # Deterministically sample the large Cartesian grid instead of taking only
    # the first combinations, which would bias the search toward low-end values.
    if len(all_candidates) > max_candidates:
        stride = max(1, len(all_candidates) // max_candidates)
        sampled = [all_candidates[i] for i in range(0, len(all_candidates), stride)]
        all_candidates = sampled[:max_candidates]

    evaluated = []
    for cand in all_candidates:
        merged_params = params | cand
        params_model = OperatingParameters(**merged_params)
        twin = compose_twin(well_id, {"parameters": params_model, "cycle_day": base["cycle_day"], "css_cycle": base["css_cycle_id"]})
        ml = predict(twin, cand)
        evaluated.append({
            "parameters": cand,
            "physics": {
                "oil_rate_bopd": round(float(twin["production_rate_bopd"]), 3),
                "sor": round(float(twin["sor"]), 3),
                "failure_probability": round(float(twin["failure_probability"]), 4),
                "equipment_health": round(float(twin["equipment_health"]), 4),
                "energy_kw": round(float(twin["motor_power_kw"]), 3),
            },
            "ml": ml,
            "risk_fusion": {
                "physics_failure_probability": round(float(twin["failure_probability"]), 4),
                "ml_failure_probability": ml["failure_probability"],
                "conservative_failure_probability_used": round(max(float(twin["failure_probability"]), ml["failure_probability"]), 4),
                "model_disagreement": round(abs(float(twin["failure_probability"]) - ml["failure_probability"]), 4),
            },
            "score": _score(ml, twin),
        })

    if not evaluated:
        raise ValueError("No feasible candidates")

    def dominates(a, b):
        ao = (a["ml"]["production_bopd"], -a["physics"]["sor"], -a["risk_fusion"]["conservative_failure_probability_used"])
        bo = (b["ml"]["production_bopd"], -b["physics"]["sor"], -b["risk_fusion"]["conservative_failure_probability_used"])
        return all(x >= y for x, y in zip(ao, bo)) and any(x > y for x, y in zip(ao, bo))

    front = [x for i, x in enumerate(evaluated) if not any(i != j and dominates(y, x) for j, y in enumerate(evaluated))]
    production = max(front, key=lambda x: x["ml"]["production_bopd"])
    efficiency = min(front, key=lambda x: x["physics"]["sor"])
    reliability = min(front, key=lambda x: x["risk_fusion"]["conservative_failure_probability_used"])
    picks = [
        {"label": "production_focus", **production},
        {"label": "efficiency_focus", **efficiency},
        {"label": "reliability_focus", **reliability},
    ]
    unique=[]; seen=set()
    for x in picks:
        sig=tuple(sorted(x["parameters"].items()))
        if sig not in seen:
            seen.add(sig); unique.append(x)
    if len(unique) < 3:
        for extra in sorted(evaluated, key=lambda x: x["score"], reverse=True):
            sig = tuple(sorted(extra["parameters"].items()))
            if sig in seen:
                continue
            seen.add(sig)
            unique.append({"label": "balanced_alternative", **extra})
            if len(unique) >= 3:
                break
    recommended = max(unique, key=lambda x: x["score"])
    max_disagreement = max(x["risk_fusion"]["model_disagreement"] for x in evaluated)
    return {
        "well_id": base["well_id"],
        "recommended": recommended,
        "pareto_options": unique[:3],
        "n_candidates": len(evaluated),
        "n_pareto": len(front),
        "engine": "ORIGIN bounded ML cross-check + BaghewalaOS physics verification",
        "source": "WagheraOS",
        "provenance": "SYNTHETIC_DEMO",
        "safety_gate": "ADVISORY_ONLY",
        "model_disagreement_max": round(max_disagreement, 4),
        "warnings": [
            "Physics risk is conservatively retained whenever it exceeds the ML failure estimate.",
            "The imported ORIGIN models are synthetic-data models and are not field calibrated.",
        ],
        "disclaimer": "Optimization is a decision-support prototype over synthetic models; it is not a field operating instruction.",
    }
