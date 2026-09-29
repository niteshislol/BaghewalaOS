"""Hybrid physics + ML/surrogate state estimator.

Does not run inside compose_twin() (optimizer loops). Attach via attach_intelligence().
"""

from __future__ import annotations

from app.physics.assumptions import DISCLAIMER, DEMO_MODE
from app.twin.session import session_for


def _agree(a: float, b: float, scale: float) -> float:
    return max(0.0, min(1.0, 1.0 - abs(a - b) / max(scale, 1e-6)))


def _ml_surrogate(twin: dict) -> dict:
    """Deterministic surrogate when sklearn well-id mapping fails. Labeled synthetic."""
    fp = twin["fingerprint"]
    steam = twin["steam_injected"]
    spm = twin["spm"]
    t = twin["reservoir_temperature"]
    mu = twin["in_situ_viscosity"]
    oil = twin["production_rate_bopd"]
    return {
        "oil_rate_bopd": round(oil * (0.90 + 0.12 * fp["production_responsiveness"]), 2),
        "temperature_c": round(min(72.0, t + steam / 900.0 * fp["thermal_responsiveness"] * 0.15), 2),
        "viscosity_cp": round(max(80.0, mu * (0.94 + 0.08 * fp["viscosity_sensitivity"])), 1),
        "rod_load_kn": round(twin["rod_load"] * (0.96 + 0.06 * fp["mechanical_risk_sensitivity"]), 2),
        "rod_float": round(min(0.95, twin["rod_float_risk"] * (0.9 + 0.15 * fp["mechanical_risk_sensitivity"])), 3),
        "pump_efficiency": round(twin["srp"].get("pump_efficiency", twin["srp"].get("volumetric_efficiency", 0.0)) * (0.97 + 0.04 * (1.1 - fp["pump_sensitivity"] * 0.1)), 3),
        "source": "deterministic_surrogate",
    }


def _try_sklearn(twin: dict) -> dict | None:
    try:
        from app.ml.predictor import predict
        from app.schemas.prediction import OperatingParameters

        p = OperatingParameters(**twin["parameters"])
        # Catalog ids (BGW-01) plus aliases used by the trained demo set.
        for wid in (twin.get("requested_id"), twin["well_id"], "BGW-001"):
            if not wid:
                continue
            try:
                m = predict(str(wid), p)
                return {
                    "oil_rate_bopd": m.predicted_oil_rate_bopd,
                    "temperature_c": m.predicted_reservoir_temperature,
                    "viscosity_cp": m.predicted_oil_viscosity,
                    "rod_load_kn": m.predicted_rod_load,
                    "rod_float": m.predicted_rod_floating_probability,
                    "pump_efficiency": m.predicted_pump_efficiency,
                    "source": m.model_production,
                }
            except Exception:
                continue
    except Exception:
        return None
    return None


def estimate_state(twin: dict) -> dict:
    sess = session_for(twin["well_id"])
    wb = twin.get("wellbore") or {}
    pts = wb.get("points") or []
    bht = pts[-1]["temperature_c"] if pts else twin["reservoir_temperature"]
    bhp = pts[-1]["pressure_bar"] if pts else twin["pressure"]
    srp = twin["srp"]

    ml = _try_sklearn(twin) or _ml_surrogate(twin)
    observed_oil = None
    if sess.history:
        observed_oil = sess.history[-1].observed_oil
    sensor = twin.get("sensor") or {}
    if sensor:
        observed_oil = sensor.get("oil_rate_bopd", observed_oil)

    w_p, w_m = sess.physics_weight, sess.ml_weight
    if sess.mae_oil > 12:
        w_p, w_m = min(0.8, w_p + 0.1), max(0.2, w_m - 0.1)
    w_o = 0.18 if observed_oil is not None else 0.0
    tot = w_p + w_m + w_o

    def fuse(phys, mlv, obs=None):
        if obs is None:
            return round((phys * w_p + mlv * w_m) / (w_p + w_m), 4)
        return round((phys * w_p + mlv * w_m + obs * w_o) / tot, 4)

    pairs = {
        "bottomhole_temperature_c": (bht, ml["temperature_c"], sensor.get("temperature_c"), 8.0, "°C"),
        "in_situ_viscosity_cp": (twin["in_situ_viscosity"], ml["viscosity_cp"], None, 250.0, "cP"),
        "oil_rate_bopd": (twin["production_rate_bopd"], ml["oil_rate_bopd"], observed_oil, 12.0, "BOPD"),
        "rod_load_kn": (twin["rod_load"], ml["rod_load_kn"], None, 25.0, "kN"),
        "rod_float_probability": (twin["rod_float_risk"], ml["rod_float"], None, 0.25, ""),
        "pump_efficiency": (srp.get("pump_efficiency", srp.get("volumetric_efficiency", 0.0)), ml["pump_efficiency"], None, 0.15, ""),
    }

    hybrid = {}
    agreements = []
    inferred = []
    for key, (phys, mlv, obs, scale, unit) in pairs.items():
        agr = _agree(phys, mlv, scale)
        agreements.append(agr)
        fused = fuse(phys, mlv, obs)
        conf = round(0.45 * agr + 0.35 * (1 - min(1.0, sess.mae_oil / 40.0)) + 0.20 * (0.55 if twin.get("fault") == "sensor_anomaly" else 0.95), 3)
        method = "hybrid_physics_ml"
        if obs is not None:
            method = "hybrid_physics_ml_observed"
        hybrid[key] = {
            "physics": phys,
            "ml": mlv,
            "observed": obs,
            "estimate": fused,
            "agreement": round(agr, 3),
            "confidence": conf,
            "ml_source": ml["source"],
            "unit": unit,
        }
        src_kind = "hybrid" if obs is not None else "physics_ml"
        inferred.append({
            "id": key,
            "value": fused,
            "unit": unit,
            "trend": "up" if fused > phys else ("down" if fused < phys else "flat"),
            "confidence": conf,
            "method": method,
            "kind": src_kind,
            "physics": phys,
            "ml": mlv,
            "observed": obs,
        })

    # Physics-only inferred (no ML analogue)
    extra = [
        ("downhole_rod_drag_kn", srp.get("hydrodynamic_drag_kn", 0), "kN", "viscous drag on rod string", "physics"),
        ("pump_fillage", srp.get("pump_fillage", srp.get("fillage", srp.get("pump_efficiency", srp.get("volumetric_efficiency", 0.0)))), "", "fillage from seating, float, viscosity", "physics"),
        ("rod_compression_kn", srp.get("rod_compression_kn", 0), "kN", "downstroke load vs buoyant rod weight", "physics"),
        ("buckling_tendency", srp.get("buckling_tendency", 0), "", "compression + viscosity + SPM", "physics"),
        ("downhole_pressure_bar", bhp, "bar", "wellbore hydrostatic + friction at TD", "physics"),
        ("fluid_mobility", twin["mobility"], "", "CSS mobility from T and μ", "physics"),
        ("thermal_state_mj", twin["thermal_energy_mj"], "MJ", "retained steam enthalpy", "physics"),
        ("reservoir_response", twin["fingerprint"]["production_responsiveness"] * twin["mobility"], "", "fingerprint × mobility", "hybrid"),
        ("carrier_bar_separation", srp.get("carrier_bar_separation", 0), "", "float + seating", "physics"),
    ]
    for eid, val, unit, method, kind in extra:
        inferred.append({
            "id": eid, "value": val, "unit": unit, "trend": "flat",
            "confidence": round(0.72 + 0.1 * (sum(agreements) / max(len(agreements), 1)), 3),
            "method": method, "kind": kind, "physics": val, "ml": None, "observed": None,
        })

    mean_agr = sum(agreements) / max(len(agreements), 1)
    return {
        "inferred": inferred,
        "hybrid": hybrid,
        "ml_source": ml["source"],
        "mean_physics_ml_agreement": round(mean_agr, 3),
        "fusion_weights": {"physics": round(w_p, 3), "ml": round(w_m, 3), "observed": round(w_o, 3)},
        "disclaimer": DISCLAIMER,
        "mode": DEMO_MODE,
    }


def twin_confidence(twin: dict, est: dict) -> dict:
    sess = session_for(twin["well_id"])
    keys = ["production_rate_bopd", "reservoir_temperature", "in_situ_viscosity", "pressure", "spm", "rod_load"]
    completeness = sum(1 for k in keys if twin.get(k) is not None) / len(keys)
    sensor_q = 0.55 if twin.get("fault") == "sensor_anomaly" else 0.97
    if twin.get("sensor"):
        sensor_q = min(sensor_q, 0.62)
    agreement = est["mean_physics_ml_agreement"]
    acc = max(0.35, 1.0 - min(1.0, sess.mae_oil / 35.0))
    freshness = 0.96 if sess.sim_day is not None else 0.88
    drift = max(0.4, 1.0 - min(1.0, abs(sess.thermal_bias) / 3.0))
    anomaly = 0.7 if twin.get("fault") and twin.get("fault") not in (None, "none") else 1.0
    overall = (
        0.18 * completeness + 0.22 * agreement + 0.22 * acc
        + 0.12 * freshness + 0.14 * sensor_q + 0.08 * drift + 0.04 * anomaly
    )
    overall = round(overall * 100, 1)
    if overall >= 80:
        band, policy = "high", "optimization_and_advisory_control_allowed"
    elif overall >= 62:
        band, policy = "medium", "advisory_only_with_warning"
    else:
        band, policy = "low", "control_blocked_operator_verification_required"
    return {
        "score_pct": overall,
        "band": band,
        "policy": policy,
        "breakdown": {
            "telemetry_completeness": round(completeness * 100, 1),
            "physics_ml_agreement": round(agreement * 100, 1),
            "recent_prediction_accuracy": round(acc * 100, 1),
            "data_freshness": round(freshness * 100, 1),
            "sensor_health": round(sensor_q * 100, 1),
            "model_drift": round(drift * 100, 1),
            "anomaly_state": round(anomaly * 100, 1),
        },
        "mae_oil_pct": sess.mae_oil,
        "disclaimer": DISCLAIMER,
    }
