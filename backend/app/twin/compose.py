"""Compose one integrated digital-twin snapshot from physics + session + optional ML."""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from app.physics.css import simulate_css
from app.physics.economics import evaluate_economics
from app.physics.risk import calculate_risks
from app.physics.srp import simulate_srp
from app.physics.wellbore import simulate_wellbore
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import get_well_meta, normalize_well_id
from app.twin.session import session_for


def _ser(obj: Any) -> Any:
    if is_dataclass(obj):
        return {k: _ser(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [_ser(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _ser(v) for k, v in obj.items()}
    return obj


def _base_params(well_id: str) -> tuple[OperatingParameters, int, int]:
    try:
        from app.data.loader import get_latest_state
    except ImportError:
        def get_latest_state(wid): return None

    nid = normalize_well_id(well_id)
    sess = session_for(nid)
    state = get_latest_state(nid) or get_latest_state(well_id)
    cycle = sess.css_cycle
    day = sess.sim_day
    if sess.applied_params:
        params = sess.applied_params
    elif state:
        params = OperatingParameters(
            steam_volume=state.steam_volume,
            injection_pressure=state.injection_pressure,
            injection_duration=state.injection_duration,
            soak_time=state.soak_time,
            stroke_length=state.stroke_length,
            spm=state.spm,
            vfd_setting=state.vfd_setting,
        )
        cycle = cycle if cycle is not None else state.css_cycle_id
    else:
        params = OperatingParameters(
            steam_volume=520, injection_pressure=8.2, injection_duration=72,
            soak_time=48, stroke_length=2.5, spm=6.0, vfd_setting=70,
        )
    if cycle is None:
        cycle = 4
    if day is None:
        day = 18
    return params, int(cycle), int(day)


def compose_twin(well_id: str, overrides: dict | None = None) -> dict:
    """Primary getWellState() for the physics twin."""
    nid = normalize_well_id(well_id)
    meta = get_well_meta(nid)
    if not meta:
        raise ValueError(f"Well {well_id} not in Baghewala catalog")
    sess = session_for(nid)
    params, cycle, day = _base_params(well_id)
    ov = overrides or {}
    if "parameters" in ov:
        params = ov["parameters"]
    if "cycle_day" in ov:
        day = ov["cycle_day"]
    if "css_cycle" in ov:
        cycle = ov["css_cycle"]
    if sess.baseline_params is None:
        sess.baseline_params = params
    fault = ov.get("fault", sess.fault)

    css = simulate_css(
        meta,
        steam_volume_t=params.steam_volume,
        inject_hours=params.injection_duration,
        soak_hours=params.soak_time,
        cycle_day=day,
        cycle_number=cycle,
        spm=params.spm,
        stroke_m=params.stroke_length,
        vfd_pct=params.vfd_setting,
        thermal_bias=sess.thermal_bias,
        fault=fault,
        cycle_cutoff_day=ov.get("cycle_cutoff_day", sess.cycle_cutoff_day),
    )
    srp = simulate_srp(meta, css, stroke_m=params.stroke_length, spm=params.spm, vfd_pct=params.vfd_setting, fault=fault)
    risk = calculate_risks(meta, css, srp, fault=fault)
    wellbore = simulate_wellbore(meta, css, css.oil_rate_bopd)
    econ = evaluate_economics(css, srp, risk)
    try:
        from app.ml.srp_performance import predict_srp
        srp_ml = predict_srp(srp_state=srp, parameters=params.model_dump(), css=css, wellbore=wellbore)
    except Exception as exc:
        srp_ml = {"status": "unavailable", "error": str(exc), "provenance": "MODEL_PREDICTION"}

    fp = meta.fingerprint
    payload = {
        "well_id": nid,
        "requested_id": well_id,
        "name": meta.name,
        "location": meta.location,
        "formation": meta.formation,
        "depth_m": meta.depth_m,
        "status": meta.status,
        "operating_status": risk.operating_status,
        "css_cycle_id": cycle,
        "cycle_day": day,
        "phase": css.phase,
        "parameters": params.model_dump(),
        "production_rate_bopd": css.oil_rate_bopd,
        "cumulative_production": css.cumulative_oil_bbl,
        "reservoir_temperature": css.reservoir_temperature_c,
        "in_situ_viscosity": css.viscosity_cp,
        "pressure": css.pressure_bar,
        "steam_injected": css.steam_volume_t,
        "soak_duration_h": params.soak_time,
        "sor": css.cumulative_sor,
        "spm": params.spm,
        "vfd_frequency": params.vfd_setting,
        "motor_power_kw": srp.motor_power_kw,
        "rod_load": srp.polished_rod_max_kn,
        "rod_stress": srp.rod_stress_max_mpa,
        "fatigue_state": srp.fatigue_index,
        "pump_condition": srp.pump_condition,
        "rod_float_risk": srp.rod_float_probability,
        "impact_shock": srp.impact_shock,
        "equipment_health": risk.equipment_health,
        "failure_probability": risk.failure_probability,
        "remaining_useful_life": risk.remaining_useful_life_days,
        "asphaltene_deposition_risk": css.asphaltene_risk,
        "heated_radius_m": css.heated_radius_m,
        "thermal_energy_mj": css.thermal_energy_mj,
        "mobility": css.mobility,
        "fault": fault,
        "autonomous": sess.autonomous,
        "css": _ser(css),
        "srp": {k: v for k, v in _ser(srp).items() if k not in {"surface_card", "downhole_card"}} | {
            "surface_card": _ser(srp.surface_card),
            "downhole_card": _ser(srp.downhole_card),
            "goodman": srp.goodman,
            # Canonical compatibility aliases consumed by intelligence/ML layers.
            "pump_fillage": getattr(srp, "fillage", 0.0),
            "pump_efficiency": getattr(srp, "volumetric_efficiency", getattr(srp, "pump_condition", 0.0)),
            "polished_rod_min_kn": getattr(srp, "polished_rod_min_kn", 0.0),
            "hydrodynamic_drag_kn": getattr(srp, "tubing_friction_kpa", 0.0),
            "buckling_tendency": getattr(srp, "rod_float_index", 0.0),
            "rod_compression_kn": max(0.0, -getattr(srp, "mprl_lbf", 0.0) * 0.00444822),
            "carrier_bar_separation": 1.0 if getattr(srp, "rod_floating", False) else 0.0,
            "rod_float_index": getattr(srp, "rod_float_index", 0.0),
            "rod_floating": getattr(srp, "rod_floating", False),
            "impact_index": getattr(srp, "impact_index", 0.0),
            "gearbox_load_pct": getattr(srp, "gearbox_load_pct", 0.0),
            "structural_load_pct": getattr(srp, "structural_load_pct", 0.0),
        },
        "risk": _ser(risk),
        "wellbore": _ser(wellbore),
        "economics": _ser(econ),
        "srp_ml": srp_ml,
        "fingerprint": {
            "thermal_responsiveness": fp.thermal_responsiveness,
            "cooling_rate": fp.cooling_rate,
            "production_responsiveness": fp.production_responsiveness,
            "viscosity_sensitivity": fp.viscosity_sensitivity,
            "pump_sensitivity": fp.pump_sensitivity,
            "mechanical_risk_sensitivity": fp.mechanical_sensitivity,
            "steam_efficiency": fp.steam_efficiency,
            "historical_failure_tendency": fp.historical_failure_tendency,
            "asphaltene_tendency": fp.asphaltene_tendency,
            "thermal_bias_learned": sess.thermal_bias,
            "mae_oil": sess.mae_oil,
        },
        "session": {
            "fault": sess.fault,
            "sim_day": sess.sim_day,
            "css_cycle": sess.css_cycle,
            "autonomous": sess.autonomous,
            "cycle_cutoff_day": sess.cycle_cutoff_day,
            "mae_oil": sess.mae_oil,
            "prediction_history": [r.__dict__ for r in sess.history[-8:]],
        },
        "simulation_mode": "synthetic_physics_informed_oil_twin",
        "demo_disclaimer": css.disclaimer,
        "sensor": None,
    }
    if fault == "sensor_anomaly":
        payload["sensor"] = {
            "oil_rate_bopd": round(css.oil_rate_bopd * 1.28, 2),
            "temperature_c": round(css.reservoir_temperature_c - 7.5, 2),
            "pressure_bar": round(css.pressure_bar + 2.1, 2),
            "note": "Telemetry disagrees with physics residual",
        }
    return payload
