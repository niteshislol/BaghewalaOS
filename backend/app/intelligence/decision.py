"""Probabilistic diagnostics, safety, HITL, economics, field allocation, events.

Consumes compose_twin() output. Does not replace physics or the sklearn dashboard.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.intelligence.causal import cooling_chain, graph_from_twin
from app.physics.assumptions import DISCLAIMER, economics as eco, limits
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import WELLS, get_well_meta, normalize_well_id
from app.twin.compose import compose_twin
from app.twin.estimator import estimate_state, twin_confidence
from app.twin.session import persist, session_for


def _softmax(scores: dict[str, float]) -> dict[str, float]:
    m = max(scores.values())
    exps = {k: math.exp(v - m) for k, v in scores.items()}
    z = sum(exps.values()) or 1.0
    return {k: round(v / z, 3) for k, v in exps.items()}


def probabilistic_diagnosis(twin: dict) -> dict:
    visc = twin["in_situ_viscosity"]
    spm = twin["spm"]
    flt = twin["rod_float_risk"]
    fill = twin["srp"].get("pump_fillage", twin["srp"].get("fillage", twin["srp"].get("pump_efficiency", 0.0)))
    shock = twin["impact_shock"]
    buckle = twin["srp"].get("buckling_tendency", 0)
    drag = twin["srp"].get("hydrodynamic_drag_kn", 0)
    seating = twin["srp"]["pump_seating"]
    stress = twin["rod_stress"]
    min_load = twin["srp"]["polished_rod_min_kn"]

    scores = {
        "rod_floating": 1.2 + 6.0 * flt + 0.004 * max(0, visc - 400) + 0.15 * max(0, spm - 6),
        "normal_envelope": 3.5 - 4.0 * flt - 0.003 * max(0, visc - 500) - 2.0 * (1 if seating != "seated" else 0),
        "fluid_pound": 0.4 + 3.5 * max(0, 0.72 - fill) + 1.5 * shock,
        "gas_interference": 0.3 + 2.2 * max(0, 0.65 - fill) * (0.6 if twin["phase"] == "production" else 0.3),
        "traveling_valve_leak": 0.25 + 2.8 * (1.0 - twin["srp"].get("pump_efficiency", twin["srp"].get("volumetric_efficiency", 0.0))) + (1.4 if seating != "seated" else 0),
        "pump_fillage_problem": 0.35 + 5.0 * max(0, 0.70 - fill),
        "excessive_viscous_drag": 0.4 + 0.008 * max(0, visc - 380) + 0.35 * drag,
        "rod_compression_buckling": 0.3 + 5.5 * buckle + 0.04 * max(0, 8 - min_load),
        "mechanical_overload": 0.2 + 0.03 * max(0, stress - 170) + 0.02 * max(0, twin["rod_load"] - 70),
    }
    if twin.get("fault") == "rod_float":
        scores["rod_floating"] += 3.0
    if twin.get("fault") == "high_viscosity":
        scores["excessive_viscous_drag"] += 2.5
    if twin.get("fault") == "pump_unseating":
        scores["pump_fillage_problem"] += 2.5
        scores["traveling_valve_leak"] += 1.2

    probs = _softmax(scores)
    ranked = sorted(probs.items(), key=lambda x: -x[1])
    top = ranked[0][0]
    contrib = {
        "viscosity_cp": visc,
        "spm": spm,
        "rod_float": flt,
        "fillage": fill,
        "buckling": buckle,
        "drag_kn": drag,
        "min_rod_load_kn": min_load,
        "stress_mpa": stress,
    }
    actions = {
        "rod_floating": "Reduce downstroke speed / SPM; re-check downstroke card",
        "normal_envelope": "Continue monitoring; no derate required",
        "fluid_pound": "Slow SPM; check fillage and fluid level",
        "gas_interference": "Review pump depth / gas handling; avoid speed-up",
        "traveling_valve_leak": "Plan valve / pump inspection",
        "pump_fillage_problem": "Reduce SPM; inspect seating and incomplete fill",
        "excessive_viscous_drag": "Add heat (steam/soak); do not raise SPM",
        "rod_compression_buckling": "Asymmetric downstroke damping; lower SPM",
        "mechanical_overload": "Cut SPM and stroke; inspect rod string",
    }
    items = []
    for name, p in ranked:
        sev = "Critical" if p > 0.35 and name != "normal_envelope" else ("Warning" if p > 0.18 and name != "normal_envelope" else "Info")
        items.append({
            "condition": name,
            "probability": p,
            "severity": sev if name != "normal_envelope" else "Normal",
            "evidence": _evidence_for(name, twin),
            "contributing_variables": contrib,
            "recommended_action": actions[name],
        })
    return {
        "primary": top,
        "items": items,
        "disclaimer": DISCLAIMER,
    }


def _evidence_for(name: str, twin: dict) -> list[str]:
    srp = twin["srp"]
    mapping = {
        "rod_floating": [f"float P={twin['rod_float_risk']:.2f}", f"downstroke load {srp.get('downstroke_load_kn')} kN"],
        "normal_envelope": [f"health {twin['equipment_health']}", f"Goodman util {srp['goodman']['utilization']}"],
        "fluid_pound": [f"fillage {srp.get('pump_fillage')}", f"impact {twin['impact_shock']}"],
        "gas_interference": [f"fillage {srp.get('pump_fillage')}", f"phase {twin['phase']}"],
        "traveling_valve_leak": [f"pump η {srp['pump_efficiency']}", f"seating {srp['pump_seating']}"],
        "pump_fillage_problem": [f"fillage {srp.get('pump_fillage')}", f"seating {srp['pump_seating']}"],
        "excessive_viscous_drag": [f"μ={twin['in_situ_viscosity']:.0f} cP", f"drag {srp.get('hydrodynamic_drag_kn')} kN"],
        "rod_compression_buckling": [f"buckle {srp.get('buckling_tendency')}", f"compression {srp.get('rod_compression_kn')} kN"],
        "mechanical_overload": [f"stress {twin['rod_stress']} MPa", f"peak load {twin['rod_load']} kN"],
    }
    return mapping.get(name, [])


def asymmetric_vfd(twin: dict, gov: dict) -> dict:
    visc = twin["in_situ_viscosity"]
    flt = twin["rod_float_risk"]
    buckle = twin["srp"].get("buckling_tendency", 0)
    rec = gov["recommended_spm"]
    down_mod = -min(35.0, max(0.0, (visc - 320) / 22.0 + flt * 18.0 + buckle * 12.0))
    down_spm = rec * (1.0 + down_mod / 100.0)
    up_spm = rec * (1.0 - down_mod / 220.0)
    accel = max(0.4, 1.1 - visc / 1800.0)
    decel = max(0.35, 0.9 - flt * 0.4)
    return {
        **gov,
        "asymmetric": {
            "recommended_spm": rec,
            "upstroke_spm": round(up_spm, 2),
            "downstroke_spm": round(down_spm, 2),
            "downstroke_modulation_pct": round(down_mod, 1),
            "acceleration_factor": round(accel, 2),
            "deceleration_factor": round(decel, 2),
            "reason": (
                f"μ={visc:.0f} cP increases terminal settling time; "
                f"float P={flt:.2f}, buckle={buckle:.2f} → downstroke damping {down_mod:.0f}%."
            ),
        },
    }


def safety_interlocks(twin: dict, proposed_spm: float, confidence_pct: float) -> dict:
    srp = twin["srp"]
    fill = srp.get("pump_fillage", srp.get("pump_efficiency", srp.get("volumetric_efficiency", 0.0)))
    min_load = srp["polished_rod_min_kn"]
    whp = (twin.get("wellbore") or {}).get("points", [{}])[0].get("pressure_bar", twin["pressure"])
    motor = twin["motor_power_kw"] * (proposed_spm / max(twin["spm"], 0.1))
    rows = [
        ("max_spm", proposed_spm, limits.max_spm_at_800cp if twin["in_situ_viscosity"] > 800 else 9.2, "le"),
        ("motor_power_kw", motor, 22.0, "le"),
        ("peak_polished_rod_kn", twin["rod_load"], 95.0, "le"),
        ("min_downstroke_tension_kn", min_load, 4.0, "ge"),
        ("wellhead_pressure_bar", whp, 16.0, "le"),
        ("rod_stress_mpa", twin["rod_stress"], limits.max_rod_stress_mpa, "le"),
        ("rod_float_probability", twin["rod_float_risk"], 0.55, "le"),
        ("pump_fillage", fill, 0.40, "ge"),
        ("twin_confidence_pct", confidence_pct, 62.0, "ge"),
        ("telemetry_ok", 0.0 if twin.get("fault") == "sensor_anomaly" else 1.0, 1.0, "ge"),
    ]
    out = []
    blocked = False
    warning = False
    for name, val, lim, op in rows:
        if op == "le":
            status = "SAFE" if val <= lim * 0.9 else ("WARNING" if val <= lim else "BLOCKED")
        else:
            status = "SAFE" if val >= lim * 1.05 else ("WARNING" if val >= lim else "BLOCKED")
        if status == "BLOCKED":
            blocked = True
        if status == "WARNING":
            warning = True
        out.append({"parameter": name, "current": round(float(val), 3), "limit": lim, "status": status})
    gate = "BLOCKED" if blocked else ("WARNING" if warning else "SAFE")
    return {
        "gate": gate,
        "constraints": out,
        "allow_dispatch": gate != "BLOCKED" and confidence_pct >= 62,
        "allow_optimize": confidence_pct >= 80,
        "advisory_only": 62 <= confidence_pct < 80,
        "disclaimer": DISCLAIMER,
    }


def append_event(well_id: str, **kwargs) -> dict:
    sess = session_for(well_id)
    ev = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "day": sess.sim_day,
        "well": normalize_well_id(well_id),
        "acknowledged": False,
        **kwargs,
    }
    sess.event_log.append(ev)
    persist()
    return ev


def timeline_events(twin: dict) -> list[dict]:
    day = twin["cycle_day"]
    css = twin["css"]
    inj, soak = css["inject_days"], css["soak_days"]
    events = []
    if day <= inj:
        events.append({"id": "steam_injection", "day": day, "label": "Steam injection"})
    elif day <= inj + soak:
        events.append({"id": "soak", "day": day, "label": "Soak / heat redistribution"})
    else:
        events.append({"id": "production", "day": day, "label": "Production"})
        if twin["production_rate_bopd"] >= 28:
            events.append({"id": "peak_production", "day": day, "label": "Peak production window"})
        if twin["phase"] == "production" and day > inj + soak + 8:
            events.append({"id": "cooling", "day": day, "label": "Late-cycle cooling"})
    if twin["rod_float_risk"] > 0.38 or twin["rod_stress"] > 175:
        events.append({"id": "mechanical_risk", "day": day, "label": "Mechanical risk increase"})
    if twin.get("session", {}).get("cycle_cutoff_day") and day >= twin["session"]["cycle_cutoff_day"]:
        events.append({"id": "cutoff", "day": day, "label": "Cycle cutoff"})
    return events


def timescales(twin: dict, gov: dict, maint: dict) -> dict:
    real = [{"item": "VFD / SPM", "value": gov["recommended_spm"], "note": "Immediate mechanical envelope"}]
    hours = [{"item": "Steam / soak / cycle day", "value": twin["cycle_day"], "note": twin["phase"]}]
    weeks = [{"item": r["what"], "when": r["when"]} for r in maint.get("recommendations", [])]
    months = [{"item": "CSS strategy / cutoff", "value": twin.get("session", {}).get("cycle_cutoff_day")}]
    conflict = None
    if gov["recommended_spm"] < twin["spm"] - 0.3 and twin["phase"] == "production":
        conflict = "Real-time derate vs production offtake — mechanical safety wins."
    return {
        "real_time": real,
        "hours_days": hours,
        "weeks": weeks,
        "months_cycles": months,
        "conflict_resolution": conflict or "Timescales aligned: safety derate overrides offtake.",
    }


def similar_wells(well_id: str) -> dict:
    meta = get_well_meta(well_id)
    if not meta:
        return {"peers": []}
    fp = meta.fingerprint
    peers = []
    for w in WELLS:
        if w.well_id == meta.well_id:
            continue
        d = (
            abs(w.depth_m - meta.depth_m) / 400.0
            + abs(w.fingerprint.api_gravity - fp.api_gravity) / 4.0
            + abs(w.fingerprint.thermal_responsiveness - fp.thermal_responsiveness)
            + abs(w.fingerprint.cooling_rate - fp.cooling_rate)
            + abs(w.fingerprint.historical_failure_tendency - fp.historical_failure_tendency)
        )
        sim = max(0.0, 1.0 - d / 4.0)
        peers.append({
            "well_id": w.well_id,
            "similarity": round(sim, 3),
            "shared": {
                "formation": w.formation == meta.formation,
                "depth_m": w.depth_m,
                "api_gravity": w.fingerprint.api_gravity,
                "thermal_responsiveness": w.fingerprint.thermal_responsiveness,
                "css_cooling_rate": w.fingerprint.cooling_rate,
            },
        })
    peers.sort(key=lambda x: -x["similarity"])
    top = peers[:2]
    return {
        "well_id": meta.well_id,
        "peers": peers,
        "transfer_note": (
            f"Limited local history uses {top[0]['well_id']} and {top[1]['well_id']} "
            f"(depth, API, thermal/cooling fingerprints) as a transparent prior — not silent cloning."
            if len(top) >= 2 else "No peer prior."
        ),
    }


def economic_options(well_id: str, twin: dict) -> dict:
    from app.twin.compose import _base_params

    params, cycle, day = _base_params(well_id)
    inr = eco.inr_per_usd
    base_npv = twin["economics"]["net_operating_value"]

    derate = params.model_copy(update={"spm": max(3.2, params.spm * 0.85), "vfd_setting": max(45, params.vfd_setting - 8)})
    alt = compose_twin(well_id, {"parameters": derate, "cycle_day": day, "css_cycle": cycle})

    maint_cost = 8500 / inr
    maint_dt_oil = twin["production_rate_bopd"] * 2 * eco.oil_price_usd_bbl
    maint_npv = base_npv - maint_cost - maint_dt_oil + twin["economics"]["expected_downtime_cost"] * 0.45

    interv_cost = eco.intervention_usd
    interv_dt = twin["production_rate_bopd"] * 5 * eco.oil_price_usd_bbl
    interv_npv = base_npv - interv_cost / 30 * 5 - interv_dt + twin["economics"]["expected_intervention_cost"]

    options = [
        {
            "id": "continue",
            "label": "Continue operation",
            "oil": twin["production_rate_bopd"],
            "fail": twin["failure_probability"],
            "energy_kw": twin["motor_power_kw"],
            "downtime_cost": twin["economics"]["expected_downtime_cost"],
            "cost_usd": twin["economics"]["steam_cost"] + twin["economics"]["electricity_cost"],
            "npv_usd": base_npv,
            "npv_inr": round(base_npv * inr, 0),
        },
        {
            "id": "reduce_spm",
            "label": "Modify operating parameters (SPM −15%)",
            "oil": alt["production_rate_bopd"],
            "fail": alt["failure_probability"],
            "energy_kw": alt["motor_power_kw"],
            "downtime_cost": alt["economics"]["expected_downtime_cost"],
            "cost_usd": alt["economics"]["steam_cost"] + alt["economics"]["electricity_cost"],
            "npv_usd": alt["economics"]["net_operating_value"],
            "npv_inr": round(alt["economics"]["net_operating_value"] * inr, 0),
            "parameters": derate.model_dump(),
        },
        {
            "id": "schedule_maintenance",
            "label": "Schedule maintenance (~2 d)",
            "oil": twin["production_rate_bopd"] * 0.92,
            "fail": max(0.05, twin["failure_probability"] * 0.65),
            "energy_kw": twin["motor_power_kw"],
            "downtime_cost": maint_dt_oil,
            "cost_usd": maint_cost,
            "npv_usd": round(maint_npv, 1),
            "npv_inr": round(maint_npv * inr, 0),
        },
        {
            "id": "intervention",
            "label": "Perform intervention (~5 d)",
            "oil": twin["production_rate_bopd"] * 0.7,
            "fail": max(0.04, twin["failure_probability"] * 0.35),
            "energy_kw": 0,
            "downtime_cost": interv_dt,
            "cost_usd": interv_cost,
            "npv_usd": round(interv_npv, 1),
            "npv_inr": round(interv_npv * inr, 0),
        },
    ]
    best = max(options, key=lambda o: o["npv_usd"] - 8000 * o["fail"])
    return {
        "assumptions_inr_per_usd": inr,
        "options": options,
        "recommended": best["id"],
        "rationale": f"Highest risk-adjusted 30-day value: {best['label']}",
        "disclaimer": DISCLAIMER,
    }


def weighted_pick(pareto: list[dict], weights: dict) -> dict | None:
    if not pareto:
        return None
    oils = [c["objectives"]["oil"] for c in pareto]
    npvs = [c["objectives"]["npv"] for c in pareto]
    ens = [c["objectives"]["energy"] for c in pareto]
    sors = [c["objectives"]["sor"] for c in pareto]

    def nrm(v, xs, reverse=False):
        lo, hi = min(xs), max(xs)
        if hi <= lo:
            return 0.5
        x = (v - lo) / (hi - lo)
        return 1 - x if reverse else x

    best, best_s = None, -1e18
    for c in pareto:
        o = c["objectives"]
        s = (
            weights.get("oil", 0.3) * nrm(o["oil"], oils)
            + weights.get("npv", 0.25) * nrm(o["npv"], npvs)
            - weights.get("risk", 0.2) * o["fail"]
            - weights.get("energy", 0.1) * nrm(o["energy"], ens)
            - weights.get("sor", 0.1) * nrm(o["sor"], sors)
        )
        if s > best_s:
            best, best_s = c, s
    return best


STRATEGY_PRESETS = {
    "recovery": {"oil": 0.55, "npv": 0.15, "risk": 0.10, "energy": 0.08, "sor": 0.12},
    "reliability": {"oil": 0.15, "npv": 0.15, "risk": 0.45, "energy": 0.10, "sor": 0.15},
    "energy": {"oil": 0.20, "npv": 0.15, "risk": 0.15, "energy": 0.30, "sor": 0.20},
    "balanced": {"oil": 0.35, "npv": 0.25, "risk": 0.20, "energy": 0.10, "sor": 0.10},
}


def strategy_board(well_id: str, opt: dict) -> dict:
    labels = opt.get("labels") or {}
    mapping = {
        "max_recovery": labels.get("max_oil"),
        "balanced": labels.get("risk_adjusted_economic") or opt.get("recommended"),
        "min_energy_stress": labels.get("min_risk") or labels.get("min_sor"),
    }
    rows = []
    base_oil = opt.get("baseline", {}).get("oil", 0)
    for name, pt in mapping.items():
        if not pt:
            continue
        o = pt["objectives"]
        rows.append({
            "strategy": name,
            "parameters": pt["parameters"],
            "cycle_cutoff_day": pt.get("cycle_cutoff_day"),
            "oil": o["oil"],
            "incremental_oil": round(o["oil"] - base_oil, 2),
            "steam": o["steam"],
            "sor": o["sor"],
            "energy": o["energy"],
            "mechanical_risk": o["stress"],
            "failure_probability": o["fail"],
            "npv": o["npv"],
            "health": o["health"],
        })
    return {"strategies": rows, "disclaimer": DISCLAIMER}


def field_allocation(field: dict) -> dict:
    wells = field.get("action_plan") or []
    steam = sorted(wells, key=lambda w: -(w.get("production_opportunity", 0) / max(w.get("steam_efficiency", 0.5), 0.2)))
    spm_cut = sorted(wells, key=lambda w: -w.get("fail", 0))
    maint = sorted(wells, key=lambda w: -w.get("urgency", 0))
    return {
        "next_steam_unit": steam[0]["well_id"] if steam else None,
        "reduce_spm": [w["well_id"] for w in spm_cut if w.get("fail", 0) > 0.28][:3],
        "maintenance_priority": [w["well_id"] for w in maint[:3]],
        "bottlenecks": [w["well_id"] for w in wells if w.get("health", 1) < 0.62 or w.get("fail", 0) > 0.35],
        "disclaimer": DISCLAIMER,
    }


SCENARIO_PRESETS = {
    "increase_steam": {"steam_pct": 18},
    "change_soak": {"soak_time": 64},
    "reduce_spm": {"spm_factor": 0.85},
    "continue_20d": {"horizon_days": 20},
    "limited_steam": {"steam_pct": -25},
    "faster_cooling": {"note": "fingerprint overlay via soak reduction", "soak_time": 32},
}


def run_named_scenario(well_id: str, name: str) -> dict:
    from app.intelligence.engine import future_branches, whatif
    from app.twin.compose import _base_params

    params, _, _ = _base_params(well_id)
    if name == "reduce_spm":
        return whatif(well_id, {"spm": max(3.2, params.spm * 0.85)})
    if name == "continue_20d":
        return future_branches(well_id, 20)
    if name == "rod_risk_70":
        twin = compose_twin(well_id)
        return {
            "hypothetical": "If rod-float reached 0.70",
            "current_float": twin["rod_float_risk"],
            "implied_action": "Safety gate would BLOCK dispatch; force SPM derate",
            "blocked": True,
        }
    if name == "delay_maintenance":
        twin = compose_twin(well_id)
        return {
            "baseline_fail": twin["failure_probability"],
            "delayed_fail": min(0.95, twin["failure_probability"] * 1.35 + 0.06),
            "npv_penalty_usd": round(twin["economics"]["expected_downtime_cost"] * 0.4, 1),
        }
    if name == "maintain_now":
        return economic_options(well_id, compose_twin(well_id))
    preset = SCENARIO_PRESETS.get(name, {"steam_pct": 10})
    body = {k: v for k, v in preset.items() if k != "note"}
    return whatif(well_id, body)


def simulate_dispatch(well_id: str, spm: float | None = None, parameters: dict | None = None) -> dict:
    from app.intelligence.engine import vfd_governor
    from app.twin.compose import _base_params

    twin = compose_twin(well_id)
    est = estimate_state(twin)
    conf = twin_confidence(twin, est)
    params, cycle, day = _base_params(well_id)
    if parameters:
        p = params.model_copy(update={k: v for k, v in parameters.items() if k in OperatingParameters.model_fields})
    else:
        target = spm if spm is not None else vfd_governor(twin)["recommended_spm"]
        p = params.model_copy(update={"spm": target, "vfd_setting": max(40, min(100, 40 + (target - 3) / 7 * 60))})
    alt = compose_twin(well_id, {"parameters": p, "cycle_day": day, "css_cycle": cycle})
    safety = safety_interlocks(alt, p.spm, conf["score_pct"])
    pending = {
        "parameters": p.model_dump(),
        "from_spm": twin["spm"],
        "to_spm": p.spm,
        "safety_gate": safety["gate"],
        "allow_dispatch": safety["allow_dispatch"],
        "predicted": {
            "oil": alt["production_rate_bopd"],
            "fail": alt["failure_probability"],
            "energy_kw": alt["motor_power_kw"],
            "npv": alt["economics"]["net_operating_value"],
            "float": alt["rod_float_risk"],
        },
        "baseline": {
            "oil": twin["production_rate_bopd"],
            "fail": twin["failure_probability"],
            "energy_kw": twin["motor_power_kw"],
            "npv": twin["economics"]["net_operating_value"],
        },
        "mode": "demo_synthetic_telemetry",
    }
    sess = session_for(well_id)
    sess.pending_dispatch = pending
    persist()
    return {"pending": pending, "safety": safety, "confidence": conf, "alt": {
        "production_rate_bopd": alt["production_rate_bopd"],
        "rod_float_risk": alt["rod_float_risk"],
        "motor_power_kw": alt["motor_power_kw"],
    }}


def approve_dispatch(well_id: str) -> dict:
    from app.intelligence.engine import apply_solution

    sess = session_for(well_id)
    pending = sess.pending_dispatch
    if not pending:
        raise ValueError("No pending dispatch")
    if not pending.get("allow_dispatch"):
        append_event(well_id, subsystem="control", condition="dispatch_blocked", severity="WARNING",
                     evidence="safety_or_confidence", cause="interlock", impact="no_change",
                     recommended_action="Operator verify telemetry / derate further")
        raise ValueError("Safety/confidence interlock blocked dispatch")
    twin = apply_solution(well_id, pending["parameters"])
    sess.pending_dispatch = None
    sess.interventions.append("hitl_dispatch")
    persist()
    append_event(
        well_id, subsystem="control", condition="dispatch_approved", severity="INFO",
        confidence=None, evidence=f"SPM {pending['from_spm']}→{pending['to_spm']}",
        cause="operator_approval", impact="parameters_applied_in_demo",
        recommended_action="Observe outcome vs prediction", resulting_outcome="applied",
    )
    return {"twin": twin, "dispatched": pending, "mode": "demo_synthetic_telemetry"}


def reject_dispatch(well_id: str) -> dict:
    sess = session_for(well_id)
    sess.pending_dispatch = None
    persist()
    append_event(well_id, subsystem="control", condition="dispatch_rejected", severity="INFO",
                 cause="operator_reject", impact="no_change", recommended_action="Hold current SPM")
    return {"rejected": True}


def acknowledge_event(well_id: str, code: str) -> dict:
    sess = session_for(well_id)
    sess.acknowledged.append(code)
    for ev in sess.event_log:
        if ev.get("condition") == code or ev.get("code") == code:
            ev["acknowledged"] = True
    persist()
    return {"acknowledged": code}


def attach_intelligence(twin: dict, *, include_heavy: bool = True) -> dict:
    from app.intelligence.engine import intelligent_alerts, maintenance_plan, vfd_governor

    est = estimate_state(twin)
    conf = twin_confidence(twin, est)
    gov = asymmetric_vfd(twin, vfd_governor(twin))
    dx = probabilistic_diagnosis(twin)
    maint = maintenance_plan(twin)
    twin["inferred"] = est["inferred"]
    twin["hybrid"] = est
    twin["confidence"] = conf
    twin["probabilistic_diagnosis"] = dx
    twin["causal_graph"] = graph_from_twin(twin)
    twin["causal_chain"] = cooling_chain(twin)
    twin["governor"] = gov
    twin["safety"] = safety_interlocks(twin, gov["recommended_spm"], conf["score_pct"])
    twin["timescales"] = timescales(twin, gov, maint)
    twin["timeline_events"] = timeline_events(twin)
    twin["similar_wells"] = similar_wells(twin["well_id"])
    twin["maintenance"] = maint
    twin["alerts"] = intelligent_alerts(twin)
    twin["events"] = session_for(twin["well_id"]).event_log[-16:]
    twin["pending_dispatch"] = session_for(twin["well_id"]).pending_dispatch
    twin["objective_weights"] = session_for(twin["well_id"]).objective_weights
    if include_heavy:
        twin["economic_options"] = economic_options(twin["well_id"], twin)
    twin["control_policy"] = conf["policy"]
    return twin
