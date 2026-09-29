from pydantic import BaseModel, Field


class OperatingParameters(BaseModel):
    steam_volume: float = Field(ge=0, description="Steam volume (tons)")
    injection_pressure: float = Field(ge=0, description="Injection pressure (bar)")
    injection_duration: float = Field(ge=0, description="Injection duration (hours)")
    soak_time: float = Field(ge=0, description="Soak time (hours)")
    stroke_length: float = Field(ge=0, description="Stroke length (m)")
    spm: float = Field(ge=0, description="Strokes per minute")
    vfd_setting: float = Field(ge=0, le=100, description="VFD setting (%)")


class PredictRequest(BaseModel):
    well_id: str
    parameters: OperatingParameters | None = None


class PredictResponse(BaseModel):
    well_id: str
    model_production: str
    model_failure: str
    predicted_oil_rate_bopd: float
    predicted_reservoir_temperature: float
    predicted_oil_viscosity: float
    predicted_sor: float
    predicted_energy_per_barrel: float
    predicted_pump_efficiency: float
    predicted_rod_load: float
    predicted_rod_floating_probability: float
    predicted_failure_probability: float
    demo_disclaimer: str = "Predictions based on synthetic demo data and models — not guaranteed field outcomes."
