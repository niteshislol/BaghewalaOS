"""Baghewala well catalog — distinct fingerprints, not clones."""

from __future__ import annotations

from dataclasses import dataclass

DATASET_VERSION = "baghewala_v2_six_wells"

# Existing API tests / bookmarks still work.
ALIASES = {
    "BGW-001": "BGW-01",
    "BGW-002": "BGW-04",
    "BGW-003": "BGW-07",
}


@dataclass(frozen=True)
class WellFingerprint:
    thermal_responsiveness: float  # >1 heats faster
    cooling_rate: float  # >1 cools faster
    production_responsiveness: float
    viscosity_sensitivity: float
    pump_sensitivity: float
    mechanical_sensitivity: float
    steam_efficiency: float
    historical_failure_tendency: float  # 0-1
    asphaltene_tendency: float
    base_temp_c: float
    api_gravity: float


@dataclass(frozen=True)
class WellMeta:
    well_id: str
    name: str
    field: str
    location: str  # "lat, lon" demo
    formation: str
    depth_m: float
    status: str
    fingerprint: WellFingerprint


WELLS: list[WellMeta] = [
    WellMeta(
        "BGW-01", "Baghewala-01 (pad A)", "Baghewala", "27.8421, 72.2144",
        "Jodhpur Sandstone", 1080, "active",
        WellFingerprint(1.18, 0.88, 1.12, 0.95, 1.00, 0.92, 1.10, 0.18, 0.22, 47.6, 18.2),
    ),
    WellMeta(
        "BGW-04", "Baghewala-04 (pad A)", "Baghewala", "27.8458, 72.2191",
        "Jodhpur Sandstone", 1145, "active",
        WellFingerprint(0.92, 1.05, 0.90, 1.15, 1.08, 1.12, 0.88, 0.34, 0.40, 46.1, 17.4),
    ),
    WellMeta(
        "BGW-07", "Baghewala-07 (pad B)", "Baghewala", "27.8512, 72.2088",
        "Jodhpur Sandstone", 1210, "active",
        WellFingerprint(1.05, 0.97, 1.00, 1.00, 0.94, 0.88, 1.02, 0.22, 0.28, 48.4, 18.8),
    ),
    WellMeta(
        "BGW-09", "Baghewala-09 (pad B)", "Baghewala", "27.8566, 72.2210",
        "Jodhpur Sandstone", 990, "active",
        WellFingerprint(1.25, 1.18, 1.20, 0.85, 1.15, 1.05, 1.18, 0.15, 0.18, 49.2, 19.1),
    ),
    WellMeta(
        "BGW-12", "Baghewala-12 (pad C)", "Baghewala", "27.8380, 72.2315",
        "Jodhpur Sandstone", 1320, "active",
        WellFingerprint(0.78, 0.90, 0.82, 1.28, 1.22, 1.30, 0.75, 0.48, 0.55, 45.4, 16.8),
    ),
    WellMeta(
        "BGW-15", "Baghewala-15 (pad C)", "Baghewala", "27.8334, 72.2042",
        "Jodhpur Sandstone", 1168, "active",
        WellFingerprint(1.08, 1.02, 1.05, 1.08, 0.90, 0.96, 0.95, 0.28, 0.33, 47.0, 17.9),
    ),
]

BY_ID = {w.well_id: w for w in WELLS}


def normalize_well_id(well_id: str) -> str:
    return ALIASES.get(well_id, well_id)


def get_well_meta(well_id: str) -> WellMeta | None:
    return BY_ID.get(normalize_well_id(well_id))
