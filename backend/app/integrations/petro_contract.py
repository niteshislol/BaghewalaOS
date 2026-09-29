"""PETRO-TWIN AI contract adapters.

Keeps BaghewalaOS canonical while exposing a small, stable compatibility layer
for workflows documented by WagheraOS. These adapters deliberately call the
existing BaghewalaOS physics/intelligence engines rather than duplicating them.
"""
from __future__ import annotations
from typing import Any, Dict, List


def well_list() -> Dict[str, Any]:
    from ..twin.catalog import WELLS
    wells = []
    for w in WELLS:
        wells.append({
            "wellId": w.well_id,
            "wellName": w.name,
            "field": "Baghewala Field",
            "dataSource": "Synthetic / Physics Prototype",
        })
    return {"status": "success", "count": len(wells), "data": wells}


def production_history(well_id: str, range_name: str = "30d") -> List[Dict[str, Any]]:
    """Deterministic twin-derived history used by the Petro compatibility layer."""
    from ..services.twin_service import TwinService
    days = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}.get(range_name, 30)
    base = TwinService.get_state(well_id)
    base_rate = float(base.production.oil_rate_bopd.value)
    base_temp = float(base.reservoir.temperature_c.value)
    return [
        {
            "day": i + 1,
            "oilRateBpd": round(base_rate * (1.0 - 0.08 * (i / max(days - 1, 1))), 3),
            "reservoirTempC": round(base_temp - 5.0 * (i / max(days - 1, 1)), 3),
            "source": "deterministic-twin-projection",
        }
        for i in range(days)
    ]


def srp_payload(well_id: str) -> Dict[str, Any]:
    from ..twin.compose import compose_twin
    twin = compose_twin(well_id)
    srp = twin.get("srp", {})
    surface = srp.get("surface_card", []) or srp.get("surfaceCard", [])
    downhole = srp.get("downhole_card", []) or srp.get("downholeCard", [])
    return {
        "status": "success",
        "data": {
            "wellId": well_id,
            "pprlKn": round(float(srp.get("polished_rod_max_kn", 0.0)), 3),
            "mprlKn": round(float(srp.get("polished_rod_min_kn", 0.0)), 3),
            "fillagePct": round(float(srp.get("fillage", 0.0)) * 100.0, 2),
            "floatRiskPct": round(float(srp.get("rod_float_probability", twin.get("rod_float_risk", 0.0))) * 100.0, 2),
            "surfaceCard": surface,
            "pumpCard": downhole,
            "dataSource": "WagheraOS physics",
        },
    }
