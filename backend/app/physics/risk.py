"""Mechanical safety layer derived from SRP + CSS state."""

from __future__ import annotations

from dataclasses import dataclass

from app.physics.assumptions import limits, srp as sa
from app.physics.srp import SrpState
from app.physics.css import CSSState
from app.twin.catalog import WellMeta


@dataclass
class RiskState:
    total_rod_weight_kn: float
    viscous_drag_proxy: float
    peak_downstroke_load_kn: float
    rod_stress_mpa: float
    allowable_stress_mpa: float
    safety_factor: float
    rod_float_probability: float
    impact_shock_risk: float
    pump_seating_risk: float
    failure_probability: float
    remaining_useful_life_days: float
    equipment_health: float
    operating_status: str
    within_envelope: bool
    rejected_reason: str | None
    notes: list[str]


def calculate_risks(meta: WellMeta, css: CSSState, srp_state: SrpState, fault: str | None = None) -> RiskState:
    peak = srp_state.polished_rod_max_kn
    sf = sa.allowable_stress_mpa / max(srp_state.rod_stress_max_mpa, 1.0)
    drag = 0.012 * (css.viscosity_cp / 200.0) * meta.depth_m / 1000.0 * srp_state.spm

    fail = (
        0.04
        + srp_state.rod_float_probability * 0.35
        + srp_state.fatigue_index * 0.28
        + srp_state.impact_shock * 0.15
        + css.asphaltene_risk * 0.12
        + meta.fingerprint.historical_failure_tendency * 0.2
        + max(0, 1.25 - sf) * 0.15
    )
    if fault in {"rod_fatigue", "rod_float", "pump_unseating", "excessive_impact_shock"}:
        fail += 0.18
    fail = min(0.95, max(0.02, fail))

    health = max(0.15, 1.0 - fail * 0.7 - srp_state.fatigue_index * 0.25)
    rul = max(8.0, 420.0 * health * (1.1 - meta.fingerprint.historical_failure_tendency))

    seating_risk = 0.1 if srp_state.pump_seating == "seated" else 0.55 if srp_state.pump_seating == "light_tap" else 0.88
    status = "normal"
    if fail > 0.45 or sf < limits.min_safety_factor or srp_state.rod_float_probability > 0.5:
        status = "critical"
    elif fail > 0.28 or srp_state.fatigue_index > 0.45 or css.viscosity_cp > 700:
        status = "warning"

    rejected = None
    within = True
    if srp_state.rod_stress_max_mpa > limits.max_rod_stress_mpa:
        within, rejected = False, "Rod stress exceeds mechanical limit"
    if fail > limits.max_failure_prob:
        within, rejected = False, "Failure probability exceeds safety constraint"
    if sf < limits.min_safety_factor:
        within, rejected = False, "Safety factor below 1.25"
    if css.reservoir_temperature_c > limits.max_temperature_c:
        within, rejected = False, "Reservoir temperature above envelope"

    return RiskState(
        total_rod_weight_kn=srp_state.rod_weight_kn,
        viscous_drag_proxy=round(drag, 3),
        peak_downstroke_load_kn=srp_state.polished_rod_min_kn,
        rod_stress_mpa=srp_state.rod_stress_max_mpa,
        allowable_stress_mpa=sa.allowable_stress_mpa,
        safety_factor=round(sf, 2),
        rod_float_probability=srp_state.rod_float_probability,
        impact_shock_risk=srp_state.impact_shock,
        pump_seating_risk=seating_risk,
        failure_probability=round(fail, 3),
        remaining_useful_life_days=round(rul, 1),
        equipment_health=round(health, 3),
        operating_status=status,
        within_envelope=within,
        rejected_reason=rejected,
        notes=["Risk is computed from SRP loads, CSS viscosity/asphaltene, and well fingerprint — not random."],
    )
