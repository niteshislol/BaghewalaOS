from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ProvenanceStatus(str, Enum):
    OBSERVED = "OBSERVED"
    REPLAYED = "REPLAYED"
    ESTIMATED = "ESTIMATED"
    MODEL_PREDICTION = "MODEL_PREDICTION"
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"
    ASSUMED = "ASSUMED"


class ProvenanceEnvelope(BaseModel):
    value: float
    unit: str
    provenance: ProvenanceStatus
    source: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence: Optional[float] = None
    is_synthetic: bool = True


class ReservoirState(BaseModel):
    pressure_kpa: ProvenanceEnvelope
    temperature_c: ProvenanceEnvelope
    heated_radius_m: ProvenanceEnvelope
    skin: ProvenanceEnvelope
    permeability_md: ProvenanceEnvelope
    pay_thickness_m: ProvenanceEnvelope


class ThermalState(BaseModel):
    stored_energy_gj: ProvenanceEnvelope
    steam_injected_m3: ProvenanceEnvelope
    steam_quality: ProvenanceEnvelope
    soak_days: ProvenanceEnvelope
    cooling_rate_c_per_day: ProvenanceEnvelope


class WellboreState(BaseModel):
    tubing_profile: List[Dict[str, float]] = Field(description="List of dicts with depth_m, temp_c, viscosity_cp, pressure_kpa")
    inflow_rate_m3d: ProvenanceEnvelope
    pump_intake_pressure_kpa: ProvenanceEnvelope


class SRPState(BaseModel):
    spm: ProvenanceEnvelope
    stroke_length_m: ProvenanceEnvelope
    pprl_kn: ProvenanceEnvelope
    mprl_kn: ProvenanceEnvelope
    fillage_pct: ProvenanceEnvelope
    efficiency_pct: ProvenanceEnvelope
    rod_stress_pct: ProvenanceEnvelope
    fatigue_risk: ProvenanceEnvelope
    float_risk: ProvenanceEnvelope
    dynamometer_cards: List[Dict[str, Any]] = Field(default_factory=list)


class ProductionState(BaseModel):
    oil_rate_bopd: ProvenanceEnvelope
    liquid_rate_m3d: ProvenanceEnvelope
    water_cut_pct: ProvenanceEnvelope
    gor: ProvenanceEnvelope
    sor: ProvenanceEnvelope


class EconomicsState(BaseModel):
    energy_kwh_per_bbl: ProvenanceEnvelope
    daily_revenue_inr: ProvenanceEnvelope
    daily_opex_inr: ProvenanceEnvelope


class TwinState(BaseModel):
    well_id: str = Field(..., example="BW-017")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    lifecycle_phase: str = Field(..., example="PRODUCTION")
    cycle: int = Field(..., example=3)
    cycle_day: int = Field(..., example=45)
    
    reservoir: ReservoirState
    thermal: ThermalState
    wellbore: WellboreState
    srp: SRPState
    production: ProductionState
    economics: EconomicsState
    
    health_status: str = Field(default="HEALTHY", example="WARNING")
    active_faults: List[str] = Field(default_factory=list)
