"""Causal graph for the Baghewala CSS+SRP twin — values come from compose_twin()."""

from __future__ import annotations

CAUSAL_EDGES = [
    ("steam_injection", "reservoir_temperature"),
    ("reservoir_temperature", "crude_viscosity"),
    ("crude_viscosity", "mobility"),
    ("mobility", "inflow"),
    ("inflow", "production"),
    ("production", "srp_load"),
    ("crude_viscosity", "rod_drag"),
    ("rod_drag", "rod_stress"),
    ("srp_load", "rod_stress"),
    ("rod_drag", "rod_floating_risk"),
    ("rod_stress", "rod_floating_risk"),
    ("rod_floating_risk", "equipment_health"),
    ("srp_load", "energy_consumption"),
    ("energy_consumption", "operating_cost"),
    ("production", "economic_value"),
    ("operating_cost", "economic_value"),
    ("equipment_health", "economic_value"),
]


def graph_from_twin(twin: dict) -> dict:
    nodes = {
        "steam_injection": {"value": twin["steam_injected"], "unit": "t"},
        "reservoir_temperature": {"value": twin["reservoir_temperature"], "unit": "°C"},
        "crude_viscosity": {"value": twin["in_situ_viscosity"], "unit": "cP"},
        "mobility": {"value": twin["mobility"], "unit": ""},
        "inflow": {"value": twin["production_rate_bopd"], "unit": "BOPD"},
        "production": {"value": twin["production_rate_bopd"], "unit": "BOPD"},
        "srp_load": {"value": twin["rod_load"], "unit": "kN"},
        "rod_drag": {"value": twin["srp"].get("hydrodynamic_drag_kn", 0), "unit": "kN"},
        "rod_stress": {"value": twin["rod_stress"], "unit": "MPa"},
        "rod_floating_risk": {"value": twin["rod_float_risk"], "unit": ""},
        "equipment_health": {"value": twin["equipment_health"], "unit": ""},
        "energy_consumption": {"value": twin["motor_power_kw"], "unit": "kW"},
        "operating_cost": {
            "value": twin["economics"]["steam_cost"] + twin["economics"]["electricity_cost"],
            "unit": "USD/30d",
        },
        "economic_value": {"value": twin["economics"]["net_operating_value"], "unit": "USD/30d"},
    }
    return {"nodes": nodes, "edges": [{"from": a, "to": b} for a, b in CAUSAL_EDGES]}


def cooling_chain(twin: dict) -> dict:
    """Grounded causal explanation for the dominant mechanical risk path."""
    steps = [
        {"id": "phase", "text": f"Cycle day {twin['cycle_day']} phase {twin['phase']}", "value": twin["phase"]},
        {"id": "temperature", "text": "Reservoir / BHT thermal state", "value": f"{twin['reservoir_temperature']:.1f} °C"},
        {"id": "viscosity", "text": "Andrade viscosity from temperature", "value": f"{twin['in_situ_viscosity']:.0f} cP"},
        {"id": "drag", "text": "Hydrodynamic drag on rod string", "value": f"{twin['srp'].get('hydrodynamic_drag_kn', 0):.2f} kN"},
        {"id": "downstroke", "text": "Downstroke load vs rod weight", "value": f"{twin['srp'].get('downstroke_load_kn', 0):.1f} kN"},
        {"id": "compression", "text": "Rod compression / buckling tendency", "value": f"{twin['srp'].get('buckling_tendency', 0):.2f}"},
        {"id": "float", "text": "Rod-floating probability", "value": f"{twin['rod_float_risk']:.2f}"},
        {"id": "action", "text": "Recommended SPM derate if envelope violated", "value": f"{twin['spm']:.1f} SPM"},
    ]
    return {
        "title": "Cooling → viscosity → drag → compression → float",
        "steps": steps,
        "diagnosis": (
            "Rod-float / viscous-drag path" if twin["rod_float_risk"] > 0.38
            else "Within demo mechanical envelope"
        ),
    }
