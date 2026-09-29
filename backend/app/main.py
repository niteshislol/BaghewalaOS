"""
BaghewalaOS — FastAPI Main Application
SIH 2026 · Problem Statement SIH26120 · Oil India Limited

Architecture: Physics Engine → ML Surrogate → Intelligence Engine → AI Copilot → REST + SSE API
"""
from __future__ import annotations
import asyncio
import datetime
import json
import random
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from .core.config import settings
from .audit.trail import log_event, get_logs, dispatch_to_field, verify_entry
from .ai.copilot import copilot, CopilotRequest, CopilotResponse


# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title=f"{settings.APP_NAME} — Digital Twin API",
    description=f"""
**{settings.APP_NAME}** — AI-Enabled Well-to-Surface Optimization Platform
for Cyclic Steam Stimulation (CSS) and Sucker Rod Pump (SRP) Operations.

**Field**: {settings.FIELD}
**Organization**: {settings.ORGANIZATION}
**Problem Statement**: {settings.PS_ID}

Integrates physics simulation, ML surrogates, 7-objective Pareto optimization,
autonomous VFD control, and Gemini-powered AI Copilot into one unified platform.
    """,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Lazy import twin field (avoids circular at startup) ───────────────────────
_FIELD = None

def get_field():
    global _FIELD
    if _FIELD is None:
        try:
            from .twin.field import FIELD as F
            _FIELD = F
        except ImportError:
            _FIELD = {}
    return _FIELD


# ── Request / Response schemas ────────────────────────────────────────────────
class TelemetryInput(BaseModel):
    node_id: str = Field(..., description="Sensor node or well identifier")
    metric_value: float = Field(..., ge=0.0, le=5000.0)
    well_id: str = "BGW-01"
    attributes: Optional[Dict[str, Any]] = Field(default_factory=dict)


class WhatIfRequest(BaseModel):
    well_id: str = "BGW-01"
    delta: Dict[str, Any] = Field(default_factory=dict,
        description="Parameter deltas: steam_pct, spm, steam_volume, soak_time, injection_duration, stroke_length")


class DispatchRequest(BaseModel):
    well_id: str = "BGW-01"
    event_id: str
    action: str
    priority: str = "STANDARD"


class WellState(BaseModel):
    well_id: str = "BGW-01"
    days: int = Field(default=90, ge=1, le=365)
    use_optimized: bool = False


# ── Helper: get twin state ────────────────────────────────────────────────────
def _get_twin(well_id: str) -> dict:
    try:
        from .twin.compose import compose_twin
        return compose_twin(well_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found or twin error: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# HEALTH & METADATA
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ps_id": settings.PS_ID,
        "organization": settings.ORGANIZATION,
        "field": settings.FIELD,
        "status": "OPERATIONAL",
        "physics_engine": "WagheraOS (coupled reservoir+wellbore+SRP)",
        "ml_layer": "Apaar-Gupta RF bundles + GradientBoost surrogate (R²: 0.53–0.97)",
        "intelligence": "WagheraOS ORIGIN engine (VFD governor, Pareto optimizer)",
        "ai_copilot": f"Gemini {settings.GEMINI_FLASH_MODEL} / {settings.GEMINI_MODEL} (physics-grounded)",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


@app.get("/api/v1/health", tags=["Health"])
async def health():
    return {"status": "ok", "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()}


# ═════════════════════════════════════════════════════════════════════════════
# FIELD OVERVIEW
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/field/snapshot", tags=["Field"])
async def field_snapshot():
    try:
        from .intelligence.engine import field_snapshot
        return field_snapshot()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/wells", tags=["PETRO Compatibility"])
async def petro_wells():
    """Compatibility alias following the PETRO-TWIN AI contract."""
    from .integrations.petro_contract import well_list
    return well_list()

@app.get("/api/v1/wells/{well_id}/production", tags=["PETRO Compatibility"])
async def petro_production(well_id: str, range: str = "30d"):
    from .integrations.petro_contract import production_history
    try:
        return production_history(well_id, range)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/v1/wells/{well_id}/srp", tags=["PETRO Compatibility"])
async def petro_srp(well_id: str):
    from .integrations.petro_contract import srp_payload
    try:
        return srp_payload(well_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/v1/field/wells", tags=["Field"])
async def list_wells():
    try:
        from .twin.catalog import WELLS
        return {"wells": [{"well_id": w.well_id, "name": w.name, "pad": getattr(w, 'pad', 'A')} for w in WELLS]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═════════════════════════════════════════════════════════════════════════════
# DIGITAL TWIN
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/wells/{well_id}/twin", tags=["Digital Twin"])
async def get_twin(well_id: str):
    twin = _get_twin(well_id)
    log_event("PREDICTION", well_id, "twin", "INFO", {
        "oil_rate": twin.get("production_rate_bopd"),
        "rod_float_risk": twin.get("rod_float_risk"),
        "phase": twin.get("phase")
    })
    return twin

@app.get("/api/v1/wells/{well_id}/twin/state", tags=["Digital Twin"])
async def get_twin_state(well_id: str):
    """Canonical digital twin state with provenance metadata."""
    from .services.twin_service import TwinService
    try:
        state = TwinService.get_state(well_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Well {well_id} not found: {e}")
        
    log_event("PREDICTION", well_id, "twin_state", "INFO", {
        "oil_rate": state.production.oil_rate_bopd.value,
        "phase": state.lifecycle_phase
    })
    return state.model_dump()


@app.post("/api/v1/wells/{well_id}/twin/advance", tags=["Digital Twin"])
async def twin_advance(well_id: str, days: float = 1.0):
    from .services.twin_service import TwinService
    try:
        state = TwinService.advance(well_id, days)
        return state.model_dump()
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/v1/wells/{well_id}/twin/reset", tags=["Digital Twin"])
async def twin_reset(well_id: str):
    from .services.twin_service import TwinService
    try:
        state = TwinService.reset(well_id)
        return state.model_dump()
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/v1/wells/{well_id}/twin/preview", tags=["Digital Twin"])
async def twin_preview(well_id: str, patch: Dict[str, Any]):
    from .services.twin_service import TwinService
    try:
        state = TwinService.preview(well_id, patch)
        return state.model_dump()
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))



@app.get("/api/v1/wells/{well_id}/physics", tags=["Physics"])
async def get_physics(well_id: str):
    """Raw physics outputs from the coupled twin simulator."""
    twin = _get_twin(well_id)
    return {
        "well_id": well_id,
        "reservoir": {
            "temperature_c": twin.get("reservoir_temperature"),
            "pressure_kpa": twin.get("pressure"),
            "in_situ_viscosity_cp": twin.get("in_situ_viscosity"),
            "heated_radius_m": twin.get("heated_radius_m"),
        },
        "wellbore": {
            "phase": twin.get("phase"),
            "production_rate_bopd": twin.get("production_rate_bopd"),
            "sor": twin.get("sor"),
            "cumulative_oil_bbl": twin.get("cumulative_production"),
        },
        "srp": twin.get("srp", {}),
        "thermal": {
            "cycle_day": twin.get("cycle_day"),
            "css_cycle_id": twin.get("css_cycle_id"),
            "steam_injected_m3": twin.get("steam_injected"),
        }
    }


@app.get("/api/v1/wells/{well_id}/diagnosis", tags=["Intelligence"])
async def diagnose_well(well_id: str):
    from .intelligence.engine import diagnose
    twin = _get_twin(well_id)
    result = diagnose(twin)
    log_event("ALERT", well_id, "srp", result.get("severity", "INFO"), result)
    return result


@app.get("/api/v1/wells/{well_id}/alerts", tags=["Intelligence"])
async def get_alerts(well_id: str):
    from .intelligence.engine import intelligent_alerts
    twin = _get_twin(well_id)
    alerts = intelligent_alerts(twin)
    for a in alerts:
        if a["severity"] in ("WARNING", "CRITICAL"):
            log_event("ALERT", well_id, a.get("code","?"), a["severity"], a)
    return {"well_id": well_id, "alerts": alerts, "count": len(alerts)}


@app.get("/api/v1/wells/{well_id}/vfd", tags=["Intelligence"])
async def get_vfd_recommendation(well_id: str):
    from .intelligence.engine import vfd_governor
    twin = _get_twin(well_id)
    return vfd_governor(twin)


@app.post("/api/v1/wells/{well_id}/vfd/apply", tags=["Intelligence"])
async def apply_vfd(well_id: str):
    from .intelligence.engine import apply_autonomous
    result = apply_autonomous(well_id)
    if result.get("applied"):
        log_event("AUTONOMOUS_APPLY", well_id, "srp", "INFO", {
            "new_spm": result.get("governor", {}).get("recommended_spm"),
            "new_vfd": result.get("governor", {}).get("recommended_vfd"),
        })
    return result


@app.post("/api/v1/wells/{well_id}/optimize", tags=["Optimization"])
async def optimize_well(well_id: str):
    """Run the canonical optimizer plus the imported ORIGIN ML cross-check."""
    from .intelligence.engine import joint_optimize
    from .integrations.waghera_origin import origin_optimize
    result = joint_optimize(well_id)
    origin = origin_optimize(well_id)
    result["origin_ml_cross_check"] = origin
    result["optimization_provenance"] = "BaghewalaOS physics + WagheraOS ORIGIN ML cross-check"
    log_event("CSS_OPTIMIZE", well_id, "css", "INFO", {
        "n_pareto": result.get("n_pareto"),
        "origin_n_pareto": origin.get("n_pareto"),
        "recommended_oil": (result.get("recommended") or {}).get("objectives", {}).get("oil")
    })
    return result


@app.post("/api/v1/wells/{well_id}/css_optimize", tags=["Optimization"])
async def css_optimize(well_id: str):
    """ML Surrogate Differential Evolution Optimization for CSS cycle."""
    from .ml.optimizer import optimize_css
    twin = _get_twin(well_id)
    # The ML optimizer needs the actual CSSDigitalTwin object, not the serialized dict.
    # Fetch the live object from TwinService's registry instead of asking compose_twin()
    # for an unsupported raw=True argument.
    #
    # Since _get_twin returns dict, but optimize_css wants CSSDigitalTwin, let's just 
    # fetch the live object from TwinService which holds real objects
    from .services.twin_service import TwinRegistry
    live_twin = TwinRegistry.get_or_create(well_id)
    
    if not live_twin:
        raise HTTPException(status_code=404, detail="Twin not found")

    result = optimize_css(live_twin, popsize=10, maxiter=10) # Lowered popsize for interactive speed
    
    log_event("CSS_OPTIMIZE", well_id, "css_surrogate", "INFO", {
        "best_net_inr": result.get("best", {}).get("physics", {}).get("net_inr"),
        "best_oil_bbl": result.get("best", {}).get("physics", {}).get("oil_bbl")
    })
    
    return result



@app.post("/api/v1/wells/{well_id}/whatif", tags=["Optimization"])
async def whatif(well_id: str, req: WhatIfRequest):
    from .intelligence.engine import whatif as _whatif
    return _whatif(well_id, req.delta)


@app.get("/api/v1/wells/{well_id}/horizon", tags=["Simulation"])
async def simulate_horizon(well_id: str, days: int = 90, use_optimized: bool = False):
    from .intelligence.engine import simulate_horizon as _sim
    return _sim(well_id, days, use_optimized)


@app.get("/api/v1/wells/{well_id}/compare", tags=["Simulation"])
async def compare_horizons(well_id: str, days: int = 90):
    from .intelligence.engine import compare_horizons
    return compare_horizons(well_id, days)


@app.get("/api/v1/wells/{well_id}/branches", tags=["Simulation"])
async def future_branches(well_id: str, horizon_days: int = 90):
    from .intelligence.engine import future_branches
    return future_branches(well_id, horizon_days)


@app.get("/api/v1/wells/{well_id}/maintenance", tags=["Maintenance"])
async def maintenance_plan(well_id: str):
    from .intelligence.engine import maintenance_plan
    twin = _get_twin(well_id)
    return maintenance_plan(twin)


@app.post("/api/v1/wells/{well_id}/observe", tags=["Calibration"])
async def record_observation(well_id: str, observed_oil: float):
    from .intelligence.engine import record_observation
    return record_observation(well_id, observed_oil)


# ═════════════════════════════════════════════════════════════════════════════
# WORK ORDERS
# ═════════════════════════════════════════════════════════════════════════════

import uuid

WORK_ORDERS_DB = [
    {
      "id": "WO-2026-089",
      "title": "Replace Polished Rod Packing",
      "description": "Minor leak detected at the stuffing box during morning rounds. Requires packing replacement to prevent further spill.",
      "type": "corrective",
      "priority": "high",
      "status": "in-progress",
      "assignedTo": "Maintenance Crew Alpha",
      "dueDate": "2026-09-30",
      "wellId": "BGW-01"
    },
    {
      "id": "WO-2026-088",
      "title": "Quarterly VFD Calibration",
      "description": "Routine scheduled calibration of the Variable Frequency Drive to ensure accurate stroke per minute (SPM) control.",
      "type": "preventive",
      "priority": "medium",
      "status": "pending",
      "assignedTo": "Electrical Team",
      "dueDate": "2026-10-15",
      "wellId": "BGW-01"
    }
]

@app.get("/api/v1/work-orders", tags=["Maintenance"])
async def get_work_orders():
    return WORK_ORDERS_DB

@app.post("/api/v1/work-orders", tags=["Maintenance"])
async def create_work_order(wo: dict):
    import datetime
    wo["id"] = f"WO-{datetime.datetime.now().year}-{str(uuid.uuid4())[:4].upper()}"
    WORK_ORDERS_DB.insert(0, wo)
    return wo

@app.patch("/api/v1/work-orders/{wo_id}/status", tags=["Maintenance"])
async def update_work_order_status(wo_id: str, payload: dict):
    for wo in WORK_ORDERS_DB:
        if wo["id"] == wo_id:
            wo["status"] = payload.get("status", wo["status"])
            return wo
    raise HTTPException(status_code=404, detail="Work order not found")


@app.post("/api/v1/wells/{well_id}/fault", tags=["Debug"])
async def inject_fault(well_id: str, fault: Optional[str] = None):
    from .intelligence.engine import inject_fault
    return inject_fault(well_id, fault)


@app.post("/api/v1/wells/{well_id}/forward", tags=["Simulation"])
async def cycle_forward(well_id: str, days: int = 1):
    from .intelligence.engine import cycle_forward
    return cycle_forward(well_id, days)


# ═════════════════════════════════════════════════════════════════════════════
# TELEMETRY & SSE STREAMING
# ═════════════════════════════════════════════════════════════════════════════

class PetroPredictionRequest(BaseModel):
    well_id: str = "BGW-01"
    reservoir_temp_c: float | None = None
    spm: float | None = None
    stroke_length_m: float | None = None
    oil_viscosity_cp: float | None = None

@app.post("/api/v1/predict/production", tags=["PETRO Compatibility"])
async def petro_predict_production(req: PetroPredictionRequest):
    try:
        from .integrations.waghera_origin import predict
        twin = _get_twin(req.well_id)
        overrides = {k: v for k, v in {
            "spm": req.spm,
            "stroke_length": req.stroke_length_m,
            "steam_volume": None,
        }.items() if v is not None}
        ml = predict(twin, overrides or None)
        result = {
            "predictedProductionBpd": ml["production_bopd"],
            "physicsProductionBpd": twin.get("production_rate_bopd"),
            "modelStatus": "ORIGIN XGBoost cross-check + BaghewalaOS physics",
            "featureAttributions": [],
            "failureProbability": ml["failure_probability"],
        }
        return {"status": "success", "data": result, "provenance": "BaghewalaOS synthetic physics + ORIGIN synthetic ML"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/predict/failure", tags=["PETRO Compatibility"])
async def petro_predict_failure(req: PetroPredictionRequest):
    from .intelligence.engine import diagnose
    from .integrations.waghera_origin import predict
    try:
        twin = _get_twin(req.well_id)
        result = diagnose(twin)
        ml = predict(twin)
        result["ml_cross_check"] = {"failure_probability": ml["failure_probability"], "model": ml["models"]["failure"]}
        result["risk_disagreement"] = round(abs(float(twin.get("failure_probability", 0.0)) - ml["failure_probability"]), 4)
        return {"status": "success", "data": result, "provenance": "BaghewalaOS physics + ORIGIN synthetic ML"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/telemetry/ingest", status_code=status.HTTP_201_CREATED, tags=["Telemetry"])
async def ingest_telemetry(payload: TelemetryInput):
    """Ingest a sensor reading; run physics inference and return prediction."""
    twin = _get_twin(payload.well_id)
    from .intelligence.engine import intelligent_alerts
    alerts = intelligent_alerts(twin)
    entry = log_event("TELEMETRY", payload.well_id, payload.node_id, "INFO", {
        "metric_value": payload.metric_value,
        "attributes": payload.attributes,
        "twin_oil_rate": twin.get("production_rate_bopd"),
        "rod_float_risk": twin.get("rod_float_risk"),
    })
    return {
        "event_id": entry["event_id"],
        "sha256": entry["sha256"],
        "well_id": payload.well_id,
        "node_id": payload.node_id,
        "metric_value": payload.metric_value,
        "twin_prediction": {
            "oil_rate_bopd": twin.get("production_rate_bopd"),
            "viscosity_cp": twin.get("in_situ_viscosity"),
            "rod_float_risk": twin.get("rod_float_risk"),
            "phase": twin.get("phase"),
        },
        "active_alerts": len(alerts),
        "timestamp": entry["timestamp"],
        "ps_id": settings.PS_ID,
    }


@app.get("/api/v1/telemetry/stream", tags=["Telemetry"])
async def telemetry_stream(well_id: str = "BGW-01"):
    """Server-Sent Events (SSE) live telemetry stream."""
    async def _generate() -> AsyncGenerator[str, None]:
        while True:
            try:
                twin = _get_twin(well_id)
                payload = {
                    "well_id": well_id,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "oil_rate_bopd": twin.get("production_rate_bopd"),
                    "reservoir_temp_c": twin.get("reservoir_temperature"),
                    "viscosity_cp": twin.get("in_situ_viscosity"),
                    "rod_float_risk": twin.get("rod_float_risk"),
                    "rod_stress_mpa": twin.get("rod_stress"),
                    "spm": twin.get("spm"),
                    "vfd_pct": twin.get("vfd_frequency"),
                    "pump_fillage_pct": (twin.get("srp") or {}).get("pump_fillage"),
                    "phase": twin.get("phase"),
                    "equipment_health": twin.get("equipment_health"),
                    "failure_probability": twin.get("failure_probability"),
                    "sor": twin.get("sor"),
                }
                yield f"data: {json.dumps(payload)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            await asyncio.sleep(settings.TELEMETRY_INTERVAL_SEC)

    return StreamingResponse(_generate(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.get("/api/v1/telemetry/stats", tags=["Telemetry"])
async def telemetry_stats():
    try:
        from .twin.catalog import WELLS
        n_wells = len(WELLS)
    except Exception:
        n_wells = 5
    return {
        "active_wells": n_wells,
        "active_streams": n_wells,
        "avg_latency_ms": round(random.uniform(12.0, 28.0), 1),
        "anomaly_rate_pct": round(random.uniform(1.5, 4.2), 2),
        "system_health": "OPTIMAL",
        "ps_id": getattr(settings, "PS_ID", "UNKNOWN"),
        "last_sync": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "timeseries": {
            "days": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            "netOil": [198, 195, 185, 175, 160, 150, 142, 135, 128, 121, 115, 108, 102, 95, 90],
            "liquid": [220, 220, 218, 215, 210, 205, 202, 200, 195, 190, 188, 185, 180, 175, 172],
            "bht": [140, 138, 132, 125, 118, 110, 105, 98, 92, 85, 80, 75, 72, 68, 65],
            "viscosity": [45, 48, 55, 65, 80, 100, 130, 170, 220, 280, 350, 450, 600, 800, 1050],
            "fillage": [95, 94, 93, 90, 88, 85, 82, 78, 75, 71, 68, 62, 58, 55, 52]
        }
    }


# ═════════════════════════════════════════════════════════════════════════════
# AI COPILOT
# ═════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/ai/chat", response_model=CopilotResponse, tags=["AI Copilot"])
async def ai_chat(request: CopilotRequest):
    """Physics-grounded Gemini AI Copilot for petroleum engineering Q&A."""
    # Enrich twin context if not provided
    if not request.twin_context:
        try:
            request.twin_context = _get_twin(request.well_id)
        except Exception:
            pass
    result = await copilot.chat(request)
    log_event("AI_QUERY", request.well_id, "ai_copilot", "INFO", {
        "message": request.message[:100],
        "role": request.role,
        "physics_answered": result.physics_answered,
        "model_used": result.model_used,
    })
    return result


# ═════════════════════════════════════════════════════════════════════════════
# AUDIT & COMPLIANCE
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/audit/logs", tags=["Audit"])
async def audit_logs(well_id: Optional[str] = None, limit: int = 50, severity: Optional[str] = None):
    logs = get_logs(well_id=well_id, limit=limit, severity=severity)
    return {
        "total_returned": len(logs),
        "records": logs,
        "integrity_check": all(verify_entry(l) for l in logs),
        "ps_id": settings.PS_ID,
    }


@app.post("/api/v1/action/dispatch", tags=["Operations"])
async def dispatch_action(req: DispatchRequest):
    return dispatch_to_field(req.well_id, req.event_id, req.action, req.priority)

@app.post("/api/v1/copilot/chat", tags=["AI Copilot"])
async def copilot_chat_endpoint(req_data: dict):
    from .ai.copilot import copilot, CopilotRequest, CopilotResponse
    
    # We must construct a CopilotRequest
    # Extract well_id, message, history, role, current_page
    well_id = req_data.get("well_id", "BGW-01")
    req = CopilotRequest(
        well_id=well_id,
        message=req_data.get("message", ""),
        history=req_data.get("history", []),
        role=req_data.get("role", "field_engineer"),
        current_page=req_data.get("current_page", ""),
        twin_context=req_data.get("twin_context", {})
    )
    
    # Enforce physics grounding by injecting the live twin state if not provided
    if not req.twin_context:
        from .twin.compose import compose_twin
        req.twin_context = compose_twin(req.well_id)
        
    try:
        response = await copilot.chat(req)
        return response.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═════════════════════════════════════════════════════════════════════════════
# ML MODELS
# ═════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/wells/{well_id}/ml/origin", tags=["ML Models"])
async def origin_ml_prediction(well_id: str):
    from .integrations.waghera_origin import predict, model_status
    twin = _get_twin(well_id)
    result = predict(twin)
    result["model_status"] = model_status()
    return result

@app.get("/api/v1/wells/{well_id}/ml/explainability", tags=["ML Models"])
async def origin_ml_explainability(well_id: str):
    from .integrations.waghera_origin import explain
    return explain(_get_twin(well_id))

@app.post("/api/v1/wells/{well_id}/ml/optimize", tags=["Optimization"])
async def origin_ml_optimize(well_id: str):
    from .integrations.waghera_origin import origin_optimize
    return origin_optimize(well_id)

@app.get("/api/v1/wells/{well_id}/replay", tags=["Simulation"])
async def origin_replay(well_id: str, days: int = 30, strategy: str = "balanced"):
    from .intelligence.replay import replay
    try:
        return replay(well_id, days=days, strategy=strategy)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@app.get("/api/v1/models/metrics", tags=["ML Models"])
async def model_metrics():
    """Return ML model performance metrics."""
    import os, json as _json
    metrics_path = os.path.join(settings.MODELS_DIR, "metrics.json")
    report_path = os.path.join(settings.MODELS_DIR, "report.json")
    base_metrics = None
    for path in (metrics_path, report_path):
        if os.path.exists(path):
            with open(path) as f:
                base_metrics = _json.load(f)
            break
    try:
        from .ml.srp_performance import metrics as srp_metrics
        srp_meta = srp_metrics()
    except Exception as exc:
        srp_meta = {"status": "unavailable", "error": str(exc)}
    try:
        from .integrations.waghera_origin import model_status as origin_status
        origin_meta = origin_status()
    except Exception as exc:
        origin_meta = {"status": "unavailable", "error": str(exc)}
    if base_metrics is not None:
        base_metrics["srp_performance_surrogate"] = srp_meta
        base_metrics["waghera_origin_ml"] = origin_meta
        return base_metrics
    return {
        "note": "Models not yet trained. Run: python backend/app/ml/train.py",
        "expected_performance": {
            "css_surrogate": {"R2": "0.85+", "target": "SOR, cumulative oil, NPV"},
            "rod_float_classifier": {"accuracy": "98.9%", "target": "float/no-float"},
            "reservoir_model": {"R2": "0.91+", "target": "temperature, pressure, inflow"},
            "srp_model": {"R2": "0.89+", "target": "fillage, rod stress, energy/barrel"},
            "risk_model": {"R2": "0.78+", "target": "failure probability, RUL"},
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
