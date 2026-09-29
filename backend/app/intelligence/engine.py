"""Diagnostics, maintenance, VFD governor, what-if branches, field ranking."""

from __future__ import annotations

from app.physics.assumptions import DISCLAIMER
from app.schemas.prediction import OperatingParameters
from app.twin.catalog import WELLS, normalize_well_id
from app.twin.compose import compose_twin
from app.twin.session import PredictionRecord, persist, session_for


FAULTS = {
    "none": "Clear injected fault",
    "rod_float": "Rod string buoyancy / incomplete downstroke load",
    "excessive_rod_load": "Elevated fluid + inertial load",
    "pump_unseating": "Pump off-seat / incomplete fill",
    "excessive_impact_shock": "Bottom tagging / impact",
    "high_viscosity": "Cold viscous oil in tubing",
    "abnormal_pressure": "Abnormal wellbore pressure",
    "rod_fatigue": "Accumulated cyclic stress",
    "pump_inefficiency": "Worn valves / leakage",
    "asphaltene_buildup": "Deposition reducing mobility",
    "sensor_anomaly": "Inconsistent sensor vs physics",
}


def diagnose(twin: dict) -> dict:
    """Derive diagnosis from symptoms, not a canned slogan."""
    evidence = []
    causes = []
    severity = "Normal"
    if twin["rod_float_risk"] > 0.42:
        evidence.append(f"Rod-float probability {twin['rod_float_risk']:.2f}")
        causes.append("Downstroke load collapse vs rod weight (viscous hang-up or SPM too high)")
    if twin["rod_stress"] > 180:
        evidence.append(f"Peak rod stress {twin['rod_stress']:.0f} MPa")
        causes.append("Peak polished-rod load from fluid + inertia")
    if twin["in_situ_viscosity"] > 650:
        evidence.append(f"In-situ viscosity {twin['in_situ_viscosity']:.0f} cP")
        causes.append("Insufficient heat / cooling late in cycle")
    if twin["srp"]["pump_seating"] == "unseated":
        evidence.append("Pump seating = unseated")
        causes.append("Incomplete plunger travel or tagging")
    if twin["asphaltene_deposition_risk"] > 0.45:
        evidence.append(f"Deposition risk {twin['asphaltene_deposition_risk']:.2f}")
        causes.append("Cool viscous oil + asphaltene tendency fingerprint")
    if twin["failure_probability"] > 0.4:
        severity = "Critical"
    elif evidence:
        severity = "Warning"
    if twin.get("fault") == "sensor_anomaly":
        evidence.append("Sensor overlay disagrees with physics residual")
        causes.append("Instrumentation / telemetry inconsistency")
        severity = "Warning" if severity == "Normal" else severity

    action = "Continue operation with monitoring"
    if twin["rod_float_risk"] > 0.4:
        action = "Reduce SPM 0.6–1.0 and re-check downstroke card"
    elif twin["in_situ_viscosity"] > 700:
        action = "Increase steam / extend soak; avoid raising SPM"
    elif twin["fatigue_state"] > 0.5:
        action = "Schedule rod-string inspection (acoustic / visual)"
    elif twin["srp"]["pump_seating"] != "seated":
        action = "Pump intervention — check seating and valves"

    return {
        "severity": severity,
        "likely_causes": causes or ["No abnormal physics signature"],
        "evidence": evidence or ["Loads, viscosity, and seating within demo envelope"],
        "recommended_action": action,
        "predicted_consequence": (
            f"Failure P {twin['failure_probability']:.0%}, RUL {twin['remaining_useful_life']:.0f} d, "
            f"NPV ${twin['economics']['net_operating_value']:.0f}"
        ),
        "fault_injected": twin.get("fault"),
        "disclaimer": DISCLAIMER,
    }


def maintenance_plan(twin: dict) -> dict:
    recs = []
    if twin["rod_float_risk"] > 0.35:
        recs.append({
            "what": "Reduce SPM / VFD",
            "when": "Immediate (this shift)",
            "why": f"Float probability {twin['rod_float_risk']:.0%} with viscosity {twin['in_situ_viscosity']:.0f} cP",
            "risk_reduced": "Rod float, impact shock, failure probability",
            "consequence": "Slight offtake reduction; avoids unplanned downtime",
            "physics": True, "safety": True, "economic": True, "ai": False, "optimization": False,
        })
    if twin["fatigue_state"] > 0.4:
        recs.append({
            "what": "Schedule acoustic / rod inspection",
            "when": "Within 7 days",
            "why": f"Goodman fatigue index {twin['fatigue_state']:.2f}",
            "risk_reduced": "Fatigue failure, RUL erosion",
            "consequence": f"Inspection cost vs intervention ~ remaining life {twin['remaining_useful_life']:.0f} d",
            "physics": True, "safety": True, "economic": True, "ai": False, "optimization": False,
        })
    if twin["asphaltene_deposition_risk"] > 0.4:
        recs.append({
            "what": "Thermal / chemical flush",
            "when": "Next soak window",
            "why": "Deposition fingerprint + cooling viscosity",
            "risk_reduced": "Pump inefficiency, pressure loss",
            "consequence": "Flush cost vs restored mobility",
            "physics": True, "safety": False, "economic": True, "ai": False, "optimization": False,
        })
    if twin["pump_condition"] < 0.6:
        recs.append({
            "what": "Pump intervention",
            "when": "Within 14 days or next workover slot",
            "why": f"Pump condition {twin['pump_condition']:.2f}, seating {twin['srp']['pump_seating']}",
            "risk_reduced": "Unseating, lost production",
            "consequence": "Intervention cost vs downtime from failure",
            "physics": True, "safety": True, "economic": True, "ai": False, "optimization": False,
        })
    if not recs:
        recs.append({
            "what": "Continue operation with monitoring",
            "when": "Ongoing",
            "why": "Health and mechanical envelope acceptable",
            "risk_reduced": "None urgent",
            "consequence": "No extra OPEX",
            "physics": True, "safety": True, "economic": True, "ai": False, "optimization": False,
        })
    return {"well_id": twin["well_id"], "equipment_health": twin["equipment_health"], "rul_days": twin["remaining_useful_life"], "recommendations": recs}


def vfd_governor(twin: dict) -> dict:
    """Safe operating SPM from viscosity, stress, float, production, energy — not viscosity alone."""
    visc = twin["in_situ_viscosity"]
    spm0 = twin["spm"]
    target = spm0
    reasons = []
    # viscosity envelope
    if visc > 650:
        target -= 0.8
        reasons.append({"type": "physics", "text": "High viscosity increases drag and float risk"})
    elif visc < 250 and twin["rod_stress"] < 160:
        target += 0.3
        reasons.append({"type": "physics", "text": "Low viscosity allows modest speed increase"})
    if twin["rod_float_risk"] > 0.38:
        target -= 0.7
        reasons.append({"type": "safety", "text": "Rod-float probability above 0.38"})
    if twin["rod_stress"] > 190:
        target -= 0.5
        reasons.append({"type": "safety", "text": "Rod stress approaching envelope"})
    if twin["failure_probability"] > 0.32:
        target -= 0.4
        reasons.append({"type": "ai", "text": "Failure probability elevated — derate speed"})
    if twin["production_rate_bopd"] < 20 and twin["phase"] == "production":
        reasons.append({"type": "physics", "text": "Low offtake — speed-up only if mechanical room exists"})
        if twin["rod_float_risk"] < 0.25 and visc < 400:
            target += 0.25
    if twin["motor_power_kw"] > 18:
        target -= 0.2
        reasons.append({"type": "economic", "text": "Motor power high — energy penalty"})
    target = max(3.2, min(9.2, target))
    vfd = max(40, min(100, 40 + (target - 3) / 7 * 60))
    if not reasons:
        reasons.append({"type": "physics", "text": "Hold current SPM — envelope is healthy"})
    return {
        "mode": "autonomous",
        "current_spm": spm0,
        "recommended_spm": round(target, 2),
        "recommended_vfd": round(vfd, 1),
        "reasons": reasons,
        "constraints": {"spm_min": 3.2, "spm_max": 9.2, "vfd_min": 40, "vfd_max": 100},
        "disclaimer": DISCLAIMER,
    }


def apply_autonomous(well_id: str) -> dict:
    """Apply VFD recommendation only when twin confidence + safety allow it."""
    from app.intelligence.decision import asymmetric_vfd, safety_interlocks
    from app.twin.compose import _base_params
    from app.twin.estimator import estimate_state, twin_confidence

    twin = compose_twin(well_id)
    gov = asymmetric_vfd(twin, vfd_governor(twin))
    est = estimate_state(twin)
    conf = twin_confidence(twin, est)
    safety = safety_interlocks(twin, gov["recommended_spm"], conf["score_pct"])
    sess = session_for(well_id)
    sess.autonomous = True

    if not safety["allow_dispatch"] or conf["band"] == "low":
        persist()
        return {
            "governor": gov,
            "twin": compose_twin(well_id),
            "applied": False,
            "blocked": True,
            "reason": "Low confidence or safety interlock — advisory only (demo).",
            "confidence": conf,
            "safety": safety,
            "mode": "demo_synthetic_telemetry",
        }

    params, _, _ = _base_params(well_id)
    params = params.model_copy(update={"spm": gov["recommended_spm"], "vfd_setting": gov["recommended_vfd"]})
    sess.applied_params = params
    persist()
    return {
        "governor": gov,
        "twin": compose_twin(well_id),
        "applied": True,
        "blocked": False,
        "confidence": conf,
        "safety": safety,
        "mode": "demo_synthetic_telemetry",
    }


def inject_fault(well_id: str, fault: str | None) -> dict:
    sess = session_for(well_id)
    sess.fault = None if fault in (None, "none", "") else fault
    persist()
    from app.intelligence.decision import append_event
    append_event(
        well_id, subsystem="fault", condition=sess.fault or "cleared",
        severity="WARNING" if sess.fault else "INFO",
        evidence="operator_injected_fault", cause="demo_fault_injection",
        impact="physics_state_recomputed", recommended_action="Review diagnosis",
    )
    twin = compose_twin(well_id)
    return {"twin": twin, "diagnosis": diagnose(twin)}


def reconstruct(well_id: str, cycle: int, day: int) -> dict:
    """Time machine — recompute physics at cycle/day, not a label swap."""
    sess = session_for(well_id)
    sess.css_cycle = cycle
    sess.sim_day = day
    persist()
    return compose_twin(well_id)


def record_observation(well_id: str, observed_oil: float) -> dict:
    twin = compose_twin(well_id)
    pred = twin["production_rate_bopd"]
    err = (observed_oil - pred) / max(pred, 1) * 100
    sources = []
    if abs(err) > 8:
        sources.append("Thermal bias / steam efficiency mismatch")
    if twin["in_situ_viscosity"] > 600 and err < 0:
        sources.append("Viscosity under-predicted (too optimistic mobility)")
    if not sources:
        sources.append("Within demo noise band")
    rec = PredictionRecord(
        cycle=twin["css_cycle_id"], day=twin["cycle_day"],
        predicted_oil=pred, observed_oil=observed_oil, error_pct=round(err, 2), sources=sources,
    )
    sess = session_for(well_id)
    sess.history.append(rec)
    # simple recalibration: persistent negative error → cooler bias
    if err < -8:
        sess.thermal_bias -= 0.15
    elif err > 8:
        sess.thermal_bias += 0.15
    sess.thermal_bias = max(-3.0, min(3.0, sess.thermal_bias))
    errs = [abs(h.error_pct) for h in sess.history[-20:]]
    sess.mae_oil = round(sum(errs) / max(len(errs), 1), 2)
    if abs(err) > 12:
        sess.physics_weight = min(0.8, sess.physics_weight + 0.04)
        sess.ml_weight = max(0.2, sess.ml_weight - 0.04)
    else:
        sess.ml_weight = min(0.55, sess.ml_weight + 0.02)
        sess.physics_weight = max(0.45, 1.0 - sess.ml_weight)
    persist()
    return {
        "predicted_oil": pred,
        "observed_oil": observed_oil,
        "error_pct": rec.error_pct,
        "sources": sources,
        "thermal_bias": sess.thermal_bias,
        "mae_oil_pct": sess.mae_oil,
        "history": [r.__dict__ for r in sess.history[-12:]],
        "updated_twin": compose_twin(well_id),
    }


def cycle_forward(well_id: str, days: int = 1) -> dict:
    sess = session_for(well_id)
    twin = compose_twin(well_id)
    day = (sess.sim_day if sess.sim_day is not None else twin["cycle_day"]) + days
    cycle = sess.css_cycle if sess.css_cycle is not None else twin["css_cycle_id"]
    length = twin["css"]["cycle_length"]
    while day >= length:
        day -= length
        cycle += 1
    while day < 0:
        day += length
        cycle -= 1
    cycle = max(1, cycle)
    day = max(0, day)
    sess.sim_day = int(day)
    sess.css_cycle = int(cycle)
    sess.operating_log.append({
        "cycle": cycle, "day": int(day), "oil": twin["production_rate_bopd"],
        "temp": twin["reservoir_temperature"], "spm": twin["spm"],
    })
    if sess.autonomous:
        apply_autonomous(well_id)
    persist()
    return compose_twin(well_id)


def whatif(well_id: str, delta: dict) -> dict:
    base = compose_twin(well_id)
    from app.twin.compose import _base_params

    params, cycle, day = _base_params(well_id)
    p = params.model_copy()
    if "steam_pct" in delta:
        p.steam_volume *= 1 + delta["steam_pct"] / 100.0
    for k in ("steam_volume", "injection_duration", "soak_time", "spm", "vfd_setting", "stroke_length"):
        if k in delta:
            setattr(p, k, float(delta[k]))
    day2 = int(delta.get("cycle_day", day))
    cutoff = delta.get("cycle_cutoff_day")
    ov = {"parameters": p, "cycle_day": day2}
    if cutoff is not None:
        ov["cycle_cutoff_day"] = cutoff
    alt = compose_twin(well_id, ov)
    def d(a, b):
        return round(a - b, 3)
    return {
        "current": {k: base[k] for k in (
            "production_rate_bopd", "reservoir_temperature", "in_situ_viscosity", "sor",
            "rod_stress", "failure_probability", "equipment_health",
        )} | {"economics": base["economics"]["net_operating_value"]},
        "whatif": {k: alt[k] for k in (
            "production_rate_bopd", "reservoir_temperature", "in_situ_viscosity", "sor",
            "rod_stress", "failure_probability", "equipment_health",
        )} | {"economics": alt["economics"]["net_operating_value"], "parameters": p.model_dump()},
        "delta": {
            "production_bopd": d(alt["production_rate_bopd"], base["production_rate_bopd"]),
            "temperature": d(alt["reservoir_temperature"], base["reservoir_temperature"]),
            "viscosity": d(alt["in_situ_viscosity"], base["in_situ_viscosity"]),
            "sor": d(alt["sor"], base["sor"]),
            "rod_stress": d(alt["rod_stress"], base["rod_stress"]),
            "failure_probability": d(alt["failure_probability"], base["failure_probability"]),
            "energy_kw": d(alt["motor_power_kw"], base["motor_power_kw"]),
            "downtime_cost": d(alt["economics"]["expected_downtime_cost"], base["economics"]["expected_downtime_cost"]),
            "npv": d(alt["economics"]["net_operating_value"], base["economics"]["net_operating_value"]),
        },
        "disclaimer": DISCLAIMER,
    }


STRATEGIES = {
    "conservative": {"steam_volume": 420, "spm": 5.0, "soak_time": 60, "injection_duration": 64, "stroke_length": 2.3, "vfd_setting": 58},
    "balanced": {"steam_volume": 540, "spm": 6.2, "soak_time": 48, "injection_duration": 72, "stroke_length": 2.5, "vfd_setting": 70},
    "aggressive": {"steam_volume": 680, "spm": 7.6, "soak_time": 36, "injection_duration": 84, "stroke_length": 2.8, "vfd_setting": 88},
    "low_energy": {"steam_volume": 380, "spm": 4.6, "soak_time": 54, "injection_duration": 60, "stroke_length": 2.2, "vfd_setting": 52},
}


def future_branches(well_id: str, horizon_days: int = 90) -> dict:
    from app.twin.compose import _base_params

    params0, cycle, day = _base_params(well_id)
    branches = []
    for name, knobs in STRATEGIES.items():
        p = params0.model_copy(update=knobs)
        # simulate end state at day+horizon wrapped in cycle
        twin0 = compose_twin(well_id)
        length = twin0["css"]["cycle_length"]
        d2 = day + horizon_days
        c2 = cycle
        while d2 >= length:
            d2 -= length
            c2 += 1
        end = compose_twin(well_id, {"parameters": p, "cycle_day": int(d2), "css_cycle": c2})
        # crude integral: average of start/end * horizon
        start = compose_twin(well_id, {"parameters": p, "cycle_day": day, "css_cycle": cycle})
        cum = 0.5 * (start["production_rate_bopd"] + end["production_rate_bopd"]) * horizon_days
        branches.append({
            "name": name,
            "horizon_days": horizon_days,
            "parameters": p.model_dump(),
            "cumulative_oil": round(cum, 1),
            "end_sor": end["sor"],
            "end_failure": end["failure_probability"],
            "end_health": end["equipment_health"],
            "end_npv": end["economics"]["net_operating_value"],
            "steam": p.steam_volume,
            "energy_kw": end["motor_power_kw"],
            "end_state": {
                "temperature": end["reservoir_temperature"],
                "viscosity": end["in_situ_viscosity"],
                "spm": p.spm,
                "phase": end["phase"],
            },
        })
    return {"well_id": normalize_well_id(well_id), "branches": branches, "disclaimer": DISCLAIMER}


def joint_optimize(well_id: str) -> dict:
    """Physics-evaluated Pareto over CSS+SRP knobs; reject unsafe points."""
    from itertools import product
    from app.twin.compose import _base_params

    base_params, cycle, day = _base_params(well_id)
    base = compose_twin(well_id)
    steam = [420, 540, 660]
    soak = [40, 56]
    inj = [64, 76]
    spm = [5.0, 6.2, 7.2]
    stroke = [2.3, 2.7]
    cutoffs = [None, 24.0]
    scored = []
    for sv, sk, ih, sp, st, cut in product(steam, soak, inj, spm, stroke, cutoffs):
        p = OperatingParameters(
            steam_volume=sv, injection_pressure=base_params.injection_pressure,
            injection_duration=ih, soak_time=sk, stroke_length=st, spm=sp,
            vfd_setting=max(45, min(95, 40 + (sp - 3) / 7 * 60)),
        )
        t = compose_twin(well_id, {
            "parameters": p, "cycle_day": day, "css_cycle": cycle, "cycle_cutoff_day": cut,
        })
        if not t["risk"]["within_envelope"]:
            continue
        objs = {
            "oil": t["production_rate_bopd"],
            "sor": t["sor"],
            "steam": sv,
            "energy": t["motor_power_kw"],
            "stress": t["rod_stress"],
            "fatigue": t["fatigue_state"],
            "fail": t["failure_probability"],
            "npv": t["economics"]["net_operating_value"],
            "health": t["equipment_health"],
        }
        scored.append({
            "parameters": p.model_dump(),
            "cycle_cutoff_day": cut,
            "objectives": objs,
            "rejected": False,
        })

    def dominates(a, b):
        # max oil, npv, health; min sor, energy, fail, stress
        a_o = (a["oil"], -a["sor"], -a["energy"], -a["fail"], -a["stress"], a["npv"], a["health"])
        b_o = (b["oil"], -b["sor"], -b["energy"], -b["fail"], -b["stress"], b["npv"], b["health"])
        return all(x >= y for x, y in zip(a_o, b_o)) and any(x > y for x, y in zip(a_o, b_o))

    front = []
    for i, c in enumerate(scored):
        if not any(j != i and dominates(scored[j]["objectives"], c["objectives"]) for j in range(len(scored))):
            front.append(c)

    # pick risk-adjusted economic point: max npv among fail < 0.32
    from app.intelligence.decision import STRATEGY_PRESETS, strategy_board, weighted_pick

    sess = session_for(well_id)
    weights = sess.objective_weights or STRATEGY_PRESETS["balanced"]
    weighted = weighted_pick(front, weights)
    safe = [c for c in front if c["objectives"]["fail"] < 0.32] or front
    best = max(safe, key=lambda c: c["objectives"]["npv"]) if safe else None
    recommended = weighted or best

    def pick(key, reverse=True):
        pool = front or scored
        return max(pool, key=lambda c: c["objectives"][key]) if reverse else min(pool, key=lambda c: c["objectives"][key])

    labeled = {
        "risk_adjusted_economic": best,
        "max_oil": pick("oil"),
        "min_sor": pick("sor", False),
        "min_risk": pick("fail", False),
        "max_health": pick("health"),
    }
    return {
        "well_id": normalize_well_id(well_id),
        "baseline": {
            "parameters": base["parameters"],
            "oil": base["production_rate_bopd"],
            "sor": base["sor"],
            "npv": base["economics"]["net_operating_value"],
            "fail": base["failure_probability"],
            "economics": base["economics"],
        },
        "recommended": recommended,
        "weighted_recommendation": weighted,
        "objective_weights": weights,
        "labels": {k: v for k, v in labeled.items() if v},
        "strategies": strategy_board(well_id, {
            "labels": {k: v for k, v in labeled.items() if v},
            "recommended": recommended,
            "baseline": {
                "oil": base["production_rate_bopd"],
            },
        })["strategies"],
        "pareto": front,
        "n_evaluated": 3 * 2 * 2 * 3 * 2 * 2,
        "n_feasible": len(scored),
        "n_pareto": len(front),
        "disclaimer": DISCLAIMER,
    }


def apply_solution(well_id: str, parameters: dict) -> dict:
    sess = session_for(well_id)
    if sess.baseline_params is None:
        from app.twin.compose import _base_params
        p0, _, _ = _base_params(well_id)
        sess.baseline_params = p0
    sess.applied_params = OperatingParameters(**{k: v for k, v in parameters.items() if k in OperatingParameters.model_fields})
    if "cycle_cutoff_day" in parameters:
        sess.cycle_cutoff_day = parameters["cycle_cutoff_day"]
    sess.autonomous = False
    sess.interventions.append("applied_operating_point")
    persist()
    return compose_twin(well_id)


def apply_branch(well_id: str, name: str) -> dict:
    knobs = STRATEGIES.get(name)
    if not knobs:
        raise ValueError(f"Unknown branch {name}")
    from app.twin.compose import _base_params
    params0, _, _ = _base_params(well_id)
    return apply_solution(well_id, params0.model_copy(update=knobs).model_dump())


def intelligent_alerts(twin: dict) -> list[dict]:
    items = []
    def add(sev, code, cause, evidence, consequence, action):
        items.append({
            "severity": sev, "code": code, "cause": cause, "evidence": evidence,
            "predicted_consequence": consequence, "recommended_action": action,
        })
    if twin["in_situ_viscosity"] > 650:
        add("WARNING", "HIGH_VISCOSITY", "Cooling / insufficient steam heat",
            f"{twin['in_situ_viscosity']:.0f} cP", "Offtake decline and rod drag", "Extend soak or add steam; do not raise SPM")
    if twin["rod_stress"] > 180:
        add("WARNING", "ROD_STRESS", "Peak polished-rod load",
            f"{twin['rod_stress']:.0f} MPa", "Fatigue and possible rod failure", "Reduce SPM / stroke")
    if twin["rod_float_risk"] > 0.4:
        add("CRITICAL", "ROD_FLOAT", "Downstroke load collapse",
            f"P={twin['rod_float_risk']:.2f}", "Impact shock / unseating", "Cut SPM immediately")
    if twin["srp"]["pump_seating"] != "seated":
        add("CRITICAL", "PUMP_UNSEAT", "Incomplete seating",
            twin["srp"]["pump_seating"], "Lost production", "Pump intervention")
    if twin["asphaltene_deposition_risk"] > 0.45:
        add("WARNING", "DEPOSITION", "Cool viscous oil + fingerprint",
            f"{twin['asphaltene_deposition_risk']:.2f}", "Pump inefficiency", "Thermal/chemical flush")
    if twin["failure_probability"] > 0.35:
        add("CRITICAL", "PRED_FAIL", "Combined mechanical + thermal risk",
            f"{twin['failure_probability']:.1%}", f"RUL {twin['remaining_useful_life']:.0f} d", "Derate and inspect")
    if twin["sor"] > 3.5:
        add("WARNING", "HIGH_SOR", "Steam not converting to oil",
            f"SOR {twin['sor']:.2f}", "Steam OPEX waste", "Cut steam or improve soak")
    if twin.get("fault") == "sensor_anomaly" or twin.get("sensor"):
        add("WARNING", "SENSOR_ANOMALY", "Instrumentation residual vs physics",
            str((twin.get("sensor") or {}).get("note", "mismatch")),
            "Bad control decisions if trusted", "Validate gauges; hold autonomous apply")
    if twin["motor_power_kw"] > 16:
        add("INFO", "ENERGY", "High SRP power",
            f"{twin['motor_power_kw']:.1f} kW", "Electricity cost", "Lower SPM if offtake allows")
    if twin["production_rate_bopd"] < 12 and twin["phase"] == "production":
        add("WARNING", "LOW_PROD", "Weak mobility or late-cycle decline",
            f"{twin['production_rate_bopd']:.1f} BOPD", "Missed recovery", "Review steam / cutoff")
    return items


def simulate_horizon(
    well_id: str,
    days: int = 90,
    use_optimized: bool = False,
    parameters: OperatingParameters | None = None,
    cycle_cutoff_day: float | None = None,
) -> dict:
    from app.twin.compose import _base_params
    params, cycle, day0 = _base_params(well_id)
    sess = session_for(well_id)
    if parameters is not None:
        params = parameters
        cutoff = cycle_cutoff_day
    else:
        cutoff = cycle_cutoff_day if cycle_cutoff_day is not None else sess.cycle_cutoff_day
    if parameters is None and use_optimized:
        opt = joint_optimize(well_id)
        rec = opt.get("recommended")
        if rec:
            params = OperatingParameters(**rec["parameters"])
            if rec.get("cycle_cutoff_day") is not None:
                cutoff = rec["cycle_cutoff_day"]
    probe = compose_twin(well_id, {"parameters": params, "cycle_day": 1, "css_cycle": cycle, "cycle_cutoff_day": cutoff})
    length = probe["css"]["cycle_length"]
    points = []
    for i in range(days + 1):
        d = day0 + i
        cyc = cycle
        while d >= length:
            d -= length
            cyc += 1
        t = compose_twin(well_id, {"parameters": params, "cycle_day": int(d), "css_cycle": cyc, "cycle_cutoff_day": cutoff})
        if sess.autonomous and use_optimized:
            gov = vfd_governor(t)
            params = params.model_copy(update={"spm": gov["recommended_spm"], "vfd_setting": gov["recommended_vfd"]})
        points.append({
            "sim_day": i,
            "cycle": cyc,
            "cycle_day": int(d),
            "phase": t["phase"],
            "reservoir_temperature": t["reservoir_temperature"],
            "viscosity": t["in_situ_viscosity"],
            "pressure": t["pressure"],
            "oil_rate_bopd": t["production_rate_bopd"],
            "sor": t["sor"],
            "spm": t["spm"],
            "vfd": t["vfd_frequency"],
            "rod_stress": t["rod_stress"],
            "health": t["equipment_health"],
            "failure_probability": t["failure_probability"],
            "energy_kw": t["motor_power_kw"],
            "heated_radius_m": t["heated_radius_m"],
        })
    return {
        "well_id": normalize_well_id(well_id),
        "mode": "optimized" if use_optimized or parameters is not None else "baseline",
        "parameters": params.model_dump(),
        "cycle_cutoff_day": cutoff,
        "points": points,
        "disclaimer": DISCLAIMER,
    }


def compare_horizons(well_id: str, days: int = 90) -> dict:
    opt_pack = joint_optimize(well_id)
    rec = opt_pack.get("recommended")
    base = simulate_horizon(well_id, days, False)
    opt_params = OperatingParameters(**rec["parameters"]) if rec else None
    opt_cut = rec.get("cycle_cutoff_day") if rec else None
    opt = simulate_horizon(well_id, days, True, parameters=opt_params, cycle_cutoff_day=opt_cut)
    def cum(pts):
        return round(sum(p["oil_rate_bopd"] for p in pts), 1)
    return {
        "baseline": base,
        "optimized": opt,
        "optimizer": {"recommended": rec, "n_pareto": opt_pack.get("n_pareto")},
        "cumulative_oil_baseline": cum(base["points"]),
        "cumulative_oil_optimized": cum(opt["points"]),
        "disclaimer": DISCLAIMER,
    }


def field_snapshot() -> dict:
    twins = [compose_twin(w.well_id) for w in WELLS]
    total_oil = sum(t["production_rate_bopd"] for t in twins)
    active = sum(1 for t in twins if t["operating_status"] != "critical")
    alert_items = [intelligent_alerts(t) for t in twins]
    alerts = sum(len(a) for a in alert_items)
    pred_fail = sum(1 for t in twins if t["failure_probability"] > 0.35)
    ranking = []
    for t in twins:
        opp = (t["fingerprint"]["production_responsiveness"] * 20 - t["production_rate_bopd"]) 
        ranking.append({
            "well_id": t["well_id"],
            "name": t["name"],
            "oil": t["production_rate_bopd"],
            "sor": t["sor"],
            "fail": t["failure_probability"],
            "health": t["equipment_health"],
            "npv": t["economics"]["net_operating_value"],
            "status": t["operating_status"],
            "production_opportunity": round(max(0, opp), 2),
            "steam_efficiency": t["fingerprint"]["steam_efficiency"],
            "urgency": round(t["failure_probability"] * 100 + (1 - t["equipment_health"]) * 40, 1),
            "action": (
                "Reduce SPM / inspect" if t["failure_probability"] > 0.35
                else "Steam / soak review" if t["sor"] > 3.2
                else "Hold + monitor"
            ),
        })
    ranking.sort(key=lambda r: r["urgency"], reverse=True)
    return {
        "field": "Baghewala",
        "wells": [{
            "well_id": t["well_id"], "name": t["name"], "oil": t["production_rate_bopd"],
            "temp": t["reservoir_temperature"], "sor": t["sor"], "health": t["equipment_health"],
            "status": t["operating_status"], "fail": t["failure_probability"], "phase": t["phase"],
        } for t in twins],
        "metrics": {
            "total_field_oil_rate": round(total_oil, 1),
            "active_wells": active,
            "well_count": len(twins),
            "field_cumulative": round(sum(t["cumulative_production"] for t in twins), 1),
            "average_sor": round(sum(t["sor"] for t in twins) / len(twins), 3),
            "total_steam": round(sum(t["steam_injected"] for t in twins), 1),
            "total_energy_kw": round(sum(t["motor_power_kw"] for t in twins), 1),
            "field_equipment_health": round(sum(t["equipment_health"] for t in twins) / len(twins), 3),
            "active_alerts": alerts,
            "predicted_failures": pred_fail,
            "expected_downtime_days": round(sum(t["failure_probability"] * 3 for t in twins), 2),
        },
        "action_plan": ranking,
        "fingerprints": [{ "well_id": t["well_id"], **t["fingerprint"] } for t in twins],
        "allocation": __import__("app.intelligence.decision", fromlist=["field_allocation"]).field_allocation(
            {"action_plan": ranking}
        ),
        "disclaimer": DISCLAIMER,
    }


def explain_recommendation(well_id: str, from_spm: float, to_spm: float) -> dict:
    twin = compose_twin(well_id)
    reasons = [
        {"type": "physics", "text": f"Reservoir temperature {twin['reservoir_temperature']:.1f}°C, viscosity {twin['in_situ_viscosity']:.0f} cP"},
        {"type": "safety", "text": f"Rod stress {twin['rod_stress']:.0f} MPa, float P {twin['rod_float_risk']:.2f}"},
        {"type": "ai", "text": f"Failure probability {twin['failure_probability']:.1%} ± {max(0.8, twin['failure_probability']*20):.1f} pp (demo band)"},
        {"type": "optimization", "text": f"SPM {from_spm:.1f} → {to_spm:.1f} trades incremental oil vs mechanical envelope"},
        {"type": "economic", "text": f"30-day NPV ${twin['economics']['net_operating_value']:.0f}"},
    ]
    return {"recommendation": f"Set SPM {to_spm:.1f} (from {from_spm:.1f})", "reasons": reasons, "disclaimer": DISCLAIMER}


def predictions_with_uncertainty(twin: dict) -> dict:
    oil = twin["production_rate_bopd"]
    fail = twin["failure_probability"]
    return {
        "oil_rate_bopd": {"value": oil, "sigma": round(max(2.5, oil * 0.07), 1)},
        "temperature_c": {"value": twin["reservoir_temperature"], "sigma": 1.2},
        "viscosity_cp": {"value": twin["in_situ_viscosity"], "sigma": round(twin["in_situ_viscosity"] * 0.08, 0)},
        "sor": {"value": twin["sor"], "sigma": 0.18},
        "failure_probability": {"value": fail, "sigma": round(max(0.015, fail * 0.25), 3)},
        "rod_float_probability": {"value": twin["rod_float_risk"], "sigma": 0.04},
        "rul_days": {"value": twin["remaining_useful_life"], "sigma": 18},
        "note": "Sigma is a demo uncertainty band from physics residual + well fingerprint, not a field-calibrated CI.",
    }
