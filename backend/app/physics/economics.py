"""Configurable economics for risk-adjusted operating value."""

from __future__ import annotations

from dataclasses import dataclass

from app.physics.assumptions import economics as eco
from app.physics.css import CSSState
from app.physics.srp import SrpState
from app.physics.risk import RiskState


@dataclass
class Economics:
    oil_revenue: float
    steam_cost: float
    electricity_cost: float
    maintenance_cost: float
    expected_downtime_cost: float
    expected_intervention_cost: float
    net_operating_value: float
    assumptions: dict
    notes: list[str]


def evaluate_economics(css: CSSState, srp_state: SrpState, risk: RiskState, horizon_days: float = 30.0) -> Economics:
    oil = css.oil_rate_bopd * horizon_days * eco.oil_price_usd_bbl
    steam = (css.steam_volume_t * eco.steam_cost_usd_ton) * (horizon_days / max(css.cycle_length, 1))
    kwh = srp_state.motor_power_kw * 24 * horizon_days
    elec = kwh * eco.electricity_usd_kwh
    maint = eco.maintenance_usd_day * horizon_days * (1.4 - risk.equipment_health)
    # expected downtime ~ failure prob * 3 days production
    dt = risk.failure_probability * 3.0 * css.oil_rate_bopd * eco.downtime_usd_bbl
    interv = risk.failure_probability * eco.intervention_usd * 0.15
    net = oil - steam - elec - maint - dt - interv
    return Economics(
        oil_revenue=round(oil, 1),
        steam_cost=round(steam, 1),
        electricity_cost=round(elec, 1),
        maintenance_cost=round(maint, 1),
        expected_downtime_cost=round(dt, 1),
        expected_intervention_cost=round(interv, 1),
        net_operating_value=round(net, 1),
        assumptions=eco.model_dump(),
        notes=["30-day horizon unless specified. USD demo prices in assumptions.py."],
    )
