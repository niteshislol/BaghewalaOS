"""Physics-informed CSS cycle: inject → soak → produce → cool.

Causal chain (deterministic):
  steam heat → T_res ↑ → μ ↓ → mobility ↑ → q_o ↑
  after heat input ends: T decays → μ ↑ → q_o declines.

Heated radius grows with retained enthalpy, shrinks as the chamber cools.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from app.physics.assumptions import DISCLAIMER, thermal
from app.twin.catalog import WellFingerprint, WellMeta


@dataclass
class CSSState:
    phase: str  # injection | soak | production
    cycle_number: int
    cycle_day: int
    days_in_phase: int
    inject_days: float
    soak_days: float
    produce_days: float
    cycle_length: float
    steam_volume_t: float
    reservoir_temperature_c: float
    viscosity_cp: float
    pressure_bar: float
    heated_radius_m: float
    thermal_energy_mj: float
    mobility: float
    oil_rate_bopd: float
    cumulative_oil_bbl: float
    cumulative_steam_t: float
    cumulative_sor: float
    asphaltene_risk: float
    notes: list[str]
    disclaimer: str = DISCLAIMER


def viscosity_andrade(temp_c: float, fingerprint: WellFingerprint) -> float:
    """μ = A exp(B/T) scaled by API and well viscosity_sensitivity."""
    t_k = temp_c + 273.15
    mu = thermal.andrade_a_cp * math.exp(thermal.andrade_b_k / t_k)
    api_scale = max(0.7, (22.0 - fingerprint.api_gravity) / 4.0)
    mu *= api_scale * fingerprint.viscosity_sensitivity
    return max(70.0, min(2500.0, mu))


def _phase(cycle_day: float, inject: float, soak: float, produce: float) -> tuple[str, float]:
    if cycle_day < inject:
        return "injection", cycle_day
    if cycle_day < inject + soak:
        return "soak", cycle_day - inject
    return "production", cycle_day - inject - soak


def simulate_css(
    meta: WellMeta,
    *,
    steam_volume_t: float,
    inject_hours: float,
    soak_hours: float,
    produce_days: float | None = None,
    cycle_cutoff_day: float | None = None,
    cycle_day: float = 18.0,
    cycle_number: int = 4,
    spm: float = 6.0,
    stroke_m: float = 2.5,
    vfd_pct: float = 70.0,
    pump_efficiency: float = 0.78,
    thermal_bias: float = 0.0,
    fault: str | None = None,
) -> CSSState:
    fp = meta.fingerprint
    inject_days = max(1.0, inject_hours / 24.0)
    soak_days = max(0.5, soak_hours / 24.0)
    produce = produce_days if produce_days is not None else 21.0
    cycle_len = inject_days + soak_days + produce
    cutoff = cycle_cutoff_day if cycle_cutoff_day is not None else cycle_len
    day = max(0.0, min(float(cycle_day), cutoff))

    phase, days_in_phase = _phase(day, inject_days, soak_days, produce)

    # Retained heat from steam (MJ)
    q_in = steam_volume_t * thermal.steam_enthalpy_mj_per_ton * thermal.thermal_efficiency * fp.steam_efficiency
    q_in *= fp.thermal_responsiveness
    # Injection progress 0-1
    inj_frac = min(1.0, day / inject_days) if phase == "injection" else 1.0
    energy = q_in * inj_frac

    # Cooling after injection ends
    if phase != "injection":
        cool_t = day - inject_days
        if phase == "soak":
            cool_t *= thermal.soak_soak_factor
        tau = thermal.cooling_tau_days / max(0.4, fp.cooling_rate)
        energy *= math.exp(-cool_t / tau)

    energy = max(0.0, energy)
    t0 = fp.base_temp_c + thermal_bias
    # Chamber radius grows with retained enthalpy; stays inside a demo envelope.
    radius = max(2.0, min(40.0, 3.2 + math.sqrt(energy / 14000.0)))
    delta_t = min(22.0, energy / (32000.0 + radius * 500.0))
    t_res = min(thermal.t_max_c, max(thermal.t_min_c, t0 + delta_t))

    visc = viscosity_andrade(t_res, fp)
    mobility = max(0.05, (t_res - 42.0) / 28.0) * (700.0 / visc) * fp.production_responsiveness

    steam_factor = min(1.45, 0.45 + steam_volume_t / 750.0)
    srp_factor = min(1.35, (spm * stroke_m) / 16.5) * pump_efficiency * (0.7 + 0.3 * vfd_pct / 100.0)
    srp_factor *= 1.0 / max(0.7, fp.pump_sensitivity * 0.5 + 0.5)

    # Phase offtake: no production while injecting; reduced in soak
    if phase == "injection":
        offtake = 0.12
    elif phase == "soak":
        offtake = 0.28
    else:
        decline = max(0.0, days_in_phase - 2.0) * 0.018
        offtake = max(0.35, 1.0 - decline)

    oil = max(3.0, (22.0 + 58.0 * mobility * steam_factor * srp_factor) * offtake)
    if day >= cutoff:
        oil *= 0.55

    # Pressure: injection raises, production draws down
    p = 11.8
    if phase == "injection":
        p += 2.2 * inj_frac
    elif phase == "production":
        p -= 0.04 * days_in_phase
    p = max(6.5, min(17.5, p))

    # Cumulative approximations for this cycle
    # crude integral: average rate * elapsed production-equivalent days
    prod_equiv = max(0.0, day - inject_days - soak_days * 0.7)
    cum_oil = oil * max(prod_equiv, day * 0.25)
    cum_steam = steam_volume_t if day >= inject_days else steam_volume_t * inj_frac
    cum_sor = cum_steam / max(cum_oil, 1.0)

    asp = min(0.95, fp.asphaltene_tendency * (0.4 + 0.6 * (visc / 800.0)) * (1.3 - min(1.2, t_res / 60.0)))
    if fault == "asphaltene_buildup":
        asp = min(0.95, asp + 0.35)
        visc *= 1.22
        oil *= 0.82
        mobility *= 0.8
    if fault == "high_viscosity":
        visc *= 1.45
        oil *= 0.75
        mobility *= 0.7
    if fault == "abnormal_pressure":
        p += 4.5

    notes = [
        f"Phase {phase} on cycle day {day:.1f} of {cycle_len:.1f}.",
        f"Retained heat {energy:.0f} MJ → chamber radius {radius:.1f} m, T={t_res:.1f}°C.",
        f"Andrade viscosity {visc:.0f} cP; mobility {mobility:.3f}.",
    ]
    return CSSState(
        phase=phase,
        cycle_number=cycle_number,
        cycle_day=int(round(day)),
        days_in_phase=int(round(days_in_phase)),
        inject_days=inject_days,
        soak_days=soak_days,
        produce_days=produce,
        cycle_length=cycle_len,
        steam_volume_t=steam_volume_t,
        reservoir_temperature_c=round(t_res, 2),
        viscosity_cp=round(visc, 1),
        pressure_bar=round(p, 2),
        heated_radius_m=round(radius, 2),
        thermal_energy_mj=round(energy, 1),
        mobility=round(mobility, 4),
        oil_rate_bopd=round(oil, 2),
        cumulative_oil_bbl=round(cum_oil, 1),
        cumulative_steam_t=round(cum_steam, 1),
        cumulative_sor=round(cum_sor, 3),
        asphaltene_risk=round(asp, 3),
        notes=notes,
    )
