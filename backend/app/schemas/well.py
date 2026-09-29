from datetime import datetime
from pydantic import BaseModel, Field


class WellSummary(BaseModel):
    well_id: str
    name: str
    field: str = "Baghewala"
    api_gravity: float = Field(description="Oil API gravity (demo)")
    status: str = "active"


class WellState(BaseModel):
    well_id: str
    timestamp: datetime
    css_cycle_id: int
    reservoir_temperature: float
    reservoir_pressure: float
    oil_viscosity: float
    oil_api: float
    water_cut: float
    steam_volume: float
    steam_rate: float
    injection_pressure: float
    injection_duration: float
    soak_time: float
    oil_rate_bopd: float
    stroke_length: float
    spm: float
    vfd_setting: float
    pump_efficiency: float
    rod_load: float
    energy_consumption: float
    sor: float
    energy_per_barrel: float
    rod_floating_probability: float
    failure_probability: float


class WellHistoryPoint(BaseModel):
    timestamp: datetime
    oil_rate_bopd: float
    reservoir_temperature: float
    oil_viscosity: float
    sor: float
    energy_per_barrel: float
    rod_load: float
    failure_probability: float
