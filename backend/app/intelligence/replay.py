"""Deterministic replay/simulation layer inspired by ORIGIN TwinLab.

It does not mutate the live session. Each step evaluates a bounded scenario against
BaghewalaOS's existing physics twin and the integrated ORIGIN ML cross-check.
"""
from __future__ import annotations

from app.twin.catalog import normalize_well_id
from app.twin.compose import compose_twin, _base_params
from app.integrations.waghera_origin import predict

STRATEGIES = {
    "conservative": {"steam_volume": 420.0, "spm": 5.0, "soak_time": 60.0, "injection_duration": 64.0, "stroke_length": 2.3, "vfd_setting": 58.0},
    "balanced": {"steam_volume": 540.0, "spm": 6.2, "soak_time": 48.0, "injection_duration": 72.0, "stroke_length": 2.5, "vfd_setting": 70.0},
    "aggressive": {"steam_volume": 680.0, "spm": 7.6, "soak_time": 36.0, "injection_duration": 84.0, "stroke_length": 2.8, "vfd_setting": 88.0},
    "low_energy": {"steam_volume": 380.0, "spm": 4.6, "soak_time": 54.0, "injection_duration": 60.0, "stroke_length": 2.2, "vfd_setting": 52.0},
}


def replay(well_id: str, days: int = 30, strategy: str = "balanced") -> dict:
    nid = normalize_well_id(well_id)
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown strategy {strategy}")
    if days < 1 or days > 120:
        raise ValueError("days must be between 1 and 120")
    base, cycle, day = _base_params(nid)
    target = STRATEGIES[strategy]
    points = []
    for d in range(days + 1):
        current_day = (day + d) % 30
        twin = compose_twin(nid, {"parameters": base.model_copy(update=target), "cycle_day": current_day, "css_cycle": cycle + (day + d) // 30})
        ml = predict(twin)
        points.append({
            "day": d,
            "cycle_day": current_day,
            "oil_rate_bopd": round(float(twin["production_rate_bopd"]), 3),
            "temperature_c": round(float(twin["reservoir_temperature"]), 3),
            "viscosity_cp": round(float(twin["in_situ_viscosity"]), 3),
            "sor": round(float(twin["sor"]), 3),
            "failure_probability_physics": round(float(twin["failure_probability"]), 4),
            "failure_probability_ml": ml["failure_probability"],
            "equipment_health": round(float(twin["equipment_health"]), 4),
            "rod_float_risk": round(float(twin["rod_float_risk"]), 4),
            "net_operating_value_inr": round(float(twin["economics"]["net_operating_value"]), 2),
        })
    return {
        "well_id": nid,
        "strategy": strategy,
        "days": days,
        "parameters": target,
        "points": points,
        "provenance": "REPLAYED_SYNTHETIC_PHYSICS",
        "disclaimer": "Replay is deterministic synthetic scenario analysis, not a field forecast.",
    }
