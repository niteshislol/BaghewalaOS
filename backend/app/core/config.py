"""
BaghewalaOS — Central Configuration
SIH 2026 · Problem Statement SIH26120 · Oil India Limited
"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── App ─────────────────────────────────────────────────────────────────
    APP_NAME: str = "BaghewalaOS Digital Twin"
    APP_VERSION: str = "1.0.0"
    PS_ID: str = "SIH26120"
    ORGANIZATION: str = "Oil India Limited"
    FIELD: str = "Baghewala Heavy Oil Field, Rajasthan"
    DEBUG: bool = True

    # ── Gemini AI ────────────────────────────────────────────────────────────
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_FLASH_MODEL: str = "gemini-1.5-flash"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./baghewala_os.db"

    # ── Physics defaults (Baghewala Jodhpur Sandstone) ────────────────────
    DEFAULT_RESERVOIR_TEMP_C: float = 47.0
    DEFAULT_RESERVOIR_PRESSURE_KPA: float = 5500.0
    DEFAULT_OIL_VISCOSITY_CP: float = 3200.0      # at 47°C
    DEFAULT_API_GRAVITY: float = 17.5
    DEFAULT_PERMEABILITY_MD: float = 200.0
    DEFAULT_POROSITY: float = 0.26
    DEFAULT_DEPTH_M: float = 1100.0
    DEFAULT_ASPHALTENE_PCT: float = 14.5

    # ── Data paths ──────────────────────────────────────────────────────────
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "../../../data")
    MODELS_DIR: str = os.path.normpath(os.path.join(os.path.dirname(__file__), "../ml/artifacts"))

    # ── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list = ["*"]

    # ── SSE Streaming ────────────────────────────────────────────────────────
    TELEMETRY_INTERVAL_SEC: float = 3.0

    # ── Safety thresholds ───────────────────────────────────────────────────
    ROD_FLOAT_CRITICAL: float = 0.5
    ROD_FLOAT_WARNING: float = 0.35
    FAILURE_PROB_CRITICAL: float = 0.40
    VISCOSITY_WARNING_CP: float = 650.0
    ROD_STRESS_WARNING_MPA: float = 180.0
    SOR_WARNING: float = 3.5


settings = Settings()
