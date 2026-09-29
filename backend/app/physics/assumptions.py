"""Centralized, documented simulation assumptions — synthetic Baghewala demo.

These are NOT official Oil India operating limits or calibrated field models.
Replace this module's constants when real historian/lab data is available.
All physics engines import from here so UI never embeds engineering numbers.
"""

from __future__ import annotations

from pydantic import BaseModel


class EconomicAssumptions(BaseModel):
    oil_price_usd_bbl: float = 72.0
    steam_cost_usd_ton: float = 18.5
    electricity_usd_kwh: float = 0.11
    maintenance_usd_day: float = 120.0
    intervention_usd: float = 45000.0
    downtime_usd_bbl: float = 72.0  # lost oil at oil price
    inr_per_usd: float = 83.0


class ThermalAssumptions(BaseModel):
    t_surface_c: float = 32.0
    t_init_c: float = 46.0
    t_steam_c: float = 250.0
    t_max_c: float = 78.0
    t_min_c: float = 42.0
    # Andrade viscosity: mu = A * exp(B / T_K)
    andrade_a_cp: float = 0.0018
    andrade_b_k: float = 4200.0
    # Heat capacity of heated rock+fluid volume (MJ / °C / m of radius^2)
    heat_capacity_mj_per_c_m2: float = 18.0
    steam_enthalpy_mj_per_ton: float = 2200.0
    thermal_efficiency: float = 0.42  # fraction of steam heat retained in pay
    cooling_tau_days: float = 28.0  # exponential cooling time constant
    soak_soak_factor: float = 0.55  # heat redistribution during soak
    pay_thickness_m: float = 12.0
    porosity: float = 0.18


class WellboreAssumptions(BaseModel):
    tubing_id_m: float = 0.062
    tubing_od_m: float = 0.073
    fluid_sg: float = 0.94  # heavy oil
    friction_factor: float = 0.028
    g: float = 9.81


class SrpAssumptions(BaseModel):
    steel_density: float = 7850.0
    rod_diameter_m: float = 0.022
    allowable_stress_mpa: float = 240.0
    endurance_stress_mpa: float = 140.0
    motor_efficiency: float = 0.88
    pump_bore_m: float = 0.057
    seating_gap_mm_warn: float = 4.0


class MechanicalLimits(BaseModel):
    max_rod_stress_mpa: float = 210.0
    max_spm_at_800cp: float = 5.5
    max_failure_prob: float = 0.45
    min_safety_factor: float = 1.25
    max_temperature_c: float = 78.0
    min_reservoir_pressure_bar: float = 6.0
    max_reservoir_pressure_bar: float = 18.0


economics = EconomicAssumptions()
thermal = ThermalAssumptions()
wellbore = WellboreAssumptions()
srp = SrpAssumptions()
limits = MechanicalLimits()

DEMO_MODE = "synthetic_physics_informed"
DISCLAIMER = (
    "Physics outputs are internally consistent synthetic models for SIH demo. "
    "Not calibrated against Oil India field measurements."
)
