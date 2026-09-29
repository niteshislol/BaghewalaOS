"""Runtime overlays + persistent well memory (JSON)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.schemas.prediction import OperatingParameters

MEMORY_PATH = Path(settings.DATA_DIR) / "twin_memory.json"


@dataclass
class PredictionRecord:
    cycle: int
    day: int
    predicted_oil: float
    observed_oil: float
    error_pct: float
    sources: list[str]


@dataclass
class WellSession:
    fault: str | None = None
    sim_day: int | None = None
    css_cycle: int | None = None
    autonomous: bool = False
    applied_params: OperatingParameters | None = None
    baseline_params: OperatingParameters | None = None
    cycle_cutoff_day: float | None = None
    thermal_bias: float = 0.0
    history: list[PredictionRecord] = field(default_factory=list)
    interventions: list[str] = field(default_factory=list)
    operating_log: list[dict] = field(default_factory=list)
    mae_oil: float = 0.0
    mae_temp: float = 0.0
    event_log: list[dict] = field(default_factory=list)
    pending_dispatch: dict | None = None
    objective_weights: dict = field(default_factory=lambda: {
        "oil": 0.35, "npv": 0.25, "risk": 0.20, "energy": 0.10, "sor": 0.10,
    })
    acknowledged: list[str] = field(default_factory=list)
    physics_weight: float = 0.55
    ml_weight: float = 0.45


_SESSIONS: dict[str, WellSession] = {}
_LOADED = False


def _load_all() -> None:
    global _LOADED
    if _LOADED:
        return
    _LOADED = True
    if not MEMORY_PATH.exists():
        return
    try:
        raw = json.loads(MEMORY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    for key, blob in raw.items():
        hist = [PredictionRecord(**h) for h in blob.get("history", [])]
        ap = blob.get("applied_params")
        bp = blob.get("baseline_params")
        _SESSIONS[key] = WellSession(
            fault=blob.get("fault"),
            sim_day=blob.get("sim_day"),
            css_cycle=blob.get("css_cycle"),
            autonomous=bool(blob.get("autonomous")),
            applied_params=OperatingParameters(**ap) if ap else None,
            baseline_params=OperatingParameters(**bp) if bp else None,
            cycle_cutoff_day=blob.get("cycle_cutoff_day"),
            thermal_bias=float(blob.get("thermal_bias", 0)),
            history=hist,
            interventions=list(blob.get("interventions", [])),
            operating_log=list(blob.get("operating_log", [])),
            mae_oil=float(blob.get("mae_oil", 0)),
            mae_temp=float(blob.get("mae_temp", 0)),
            event_log=list(blob.get("event_log", [])),
            pending_dispatch=blob.get("pending_dispatch"),
            objective_weights=blob.get("objective_weights") or {
                "oil": 0.35, "npv": 0.25, "risk": 0.20, "energy": 0.10, "sor": 0.10,
            },
            acknowledged=list(blob.get("acknowledged", [])),
            physics_weight=float(blob.get("physics_weight", 0.55)),
            ml_weight=float(blob.get("ml_weight", 0.45)),
        )


def persist() -> None:
    MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    out = {}
    for key, s in _SESSIONS.items():
        out[key] = {
            "fault": s.fault,
            "sim_day": s.sim_day,
            "css_cycle": s.css_cycle,
            "autonomous": s.autonomous,
            "applied_params": s.applied_params.model_dump() if s.applied_params else None,
            "baseline_params": s.baseline_params.model_dump() if s.baseline_params else None,
            "cycle_cutoff_day": s.cycle_cutoff_day,
            "thermal_bias": s.thermal_bias,
            "history": [asdict(h) for h in s.history[-40:]],
            "interventions": s.interventions[-20:],
            "operating_log": s.operating_log[-40:],
            "mae_oil": s.mae_oil,
            "mae_temp": s.mae_temp,
            "event_log": s.event_log[-40:],
            "pending_dispatch": s.pending_dispatch,
            "objective_weights": s.objective_weights,
            "acknowledged": s.acknowledged[-20:],
            "physics_weight": s.physics_weight,
            "ml_weight": s.ml_weight,
        }
    MEMORY_PATH.write_text(json.dumps(out, indent=2), encoding="utf-8")


def session_for(well_id: str) -> WellSession:
    from app.twin.catalog import normalize_well_id

    _load_all()
    key = normalize_well_id(well_id)
    if key not in _SESSIONS:
        _SESSIONS[key] = WellSession()
    return _SESSIONS[key]


def reset_session(well_id: str) -> WellSession:
    from app.twin.catalog import normalize_well_id

    _load_all()
    key = normalize_well_id(well_id)
    _SESSIONS[key] = WellSession()
    persist()
    return _SESSIONS[key]


def dump_session(well_id: str) -> dict[str, Any]:
    s = session_for(well_id)
    return {
        "fault": s.fault,
        "sim_day": s.sim_day,
        "css_cycle": s.css_cycle,
        "autonomous": s.autonomous,
        "thermal_bias": s.thermal_bias,
        "applied_params": s.applied_params.model_dump() if s.applied_params else None,
        "baseline_params": s.baseline_params.model_dump() if s.baseline_params else None,
        "cycle_cutoff_day": s.cycle_cutoff_day,
        "history": [asdict(r) for r in s.history[-12:]],
        "interventions": s.interventions[-8:],
        "operating_log": s.operating_log[-12:],
        "mae_oil": s.mae_oil,
        "mae_temp": s.mae_temp,
        "event_log": s.event_log[-12:],
        "pending_dispatch": s.pending_dispatch,
        "objective_weights": s.objective_weights,
        "acknowledged": s.acknowledged[-8:],
        "physics_weight": s.physics_weight,
        "ml_weight": s.ml_weight,
    }
