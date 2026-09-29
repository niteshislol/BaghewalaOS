"""
Nodal analysis for a rod-pumped well.

The solution node is the pump intake. The reservoir pushes fluid in along the
IPR; the pump takes fluid away at a rate fixed by stroke, SPM and plunger area.
The working fluid level floats until the two balance:

    q_inflow(P_wf)  ==  q_pump(SPM)

If the pump can move more than the reservoir can deliver, the well pumps off:
the level falls to the pump, the barrel fills only partly, and the card shows
fluid pound. That is the single most useful chart for the operator, because it
says immediately whether the well is pump-limited (steam it) or inflow-limited
(slow the unit down).
"""
from __future__ import annotations

from ..physics.fluids import BBL_PER_M3
from ..physics.wellbore import mixture_density


def solve_operating_point(reservoir, wellbore_p, r_hot, t_zone,
                          q_pump_capacity_m3d, rho_oil, tol=1e-4,
                          max_iter=60):
    """Balance inflow against pump capacity.

    Returns the operating rate, the flowing bottomhole pressure, the pump
    intake pressure, the working fluid level and the barrel fillage.
    """
    wc = reservoir.water_cut()
    rho_mix = mixture_density(wc, rho_oil, t_zone)

    # lower bound on P_wf: pumped completely off (level at the pump intake)
    p_intake_min = wellbore_p.intake_pressure(wellbore_p.pump_depth, rho_mix)
    p_wf_min = wellbore_p.pwf_from_intake(p_intake_min, rho_mix)

    q_max = reservoir.inflow(p_wf_min, r_hot, t_zone, wc)["q_liquid_m3d"]

    if q_pump_capacity_m3d >= q_max:
        # inflow-limited: pumped off, partial fillage
        fillage = q_max / max(q_pump_capacity_m3d, 1e-9)
        res = reservoir.inflow(p_wf_min, r_hot, t_zone, wc)
        return {
            "q_liquid_m3d": q_max,
            "q_oil_m3d": res["q_oil_m3d"],
            "q_water_m3d": res["q_water_m3d"],
            "p_wf_kpa": p_wf_min,
            "p_intake_kpa": p_intake_min,
            "fluid_level_m": wellbore_p.pump_depth,
            "fillage": max(min(fillage, 1.0), 0.02),
            "pumped_off": True,
            "limited_by": "inflow",
            "water_cut": wc,
            "mu_hot_cp": res["mu_hot_cp"],
            "productivity_index": res["productivity_index"],
        }

    # pump-limited: bisect on P_wf so inflow matches pump capacity
    p_out = res_p_out = reservoir.inflow(p_wf_min, r_hot, t_zone,
                                         wc)["p_outer_kpa"]
    lo, hi = p_wf_min, res_p_out
    for _ in range(max_iter):
        mid = 0.5 * (lo + hi)
        q = reservoir.inflow(mid, r_hot, t_zone, wc)["q_liquid_m3d"]
        if abs(q - q_pump_capacity_m3d) / max(q_pump_capacity_m3d, 1e-9) < tol:
            break
        if q > q_pump_capacity_m3d:
            lo = mid            # need more drawdown reduction -> raise P_wf
        else:
            hi = mid
    p_wf = 0.5 * (lo + hi)
    res = reservoir.inflow(p_wf, r_hot, t_zone, wc)
    p_intake = max(p_wf - (wellbore_p.perf_depth - wellbore_p.pump_depth)
                   * rho_mix * 9.80665 / 1000.0, wellbore_p.p_casing)
    level = wellbore_p.fluid_level_from_pwf(p_wf, rho_mix)

    return {
        "q_liquid_m3d": res["q_liquid_m3d"],
        "q_oil_m3d": res["q_oil_m3d"],
        "q_water_m3d": res["q_water_m3d"],
        "p_wf_kpa": p_wf,
        "p_intake_kpa": p_intake,
        "fluid_level_m": level,
        "fillage": 1.0,
        "pumped_off": False,
        "limited_by": "pump",
        "water_cut": wc,
        "mu_hot_cp": res["mu_hot_cp"],
        "productivity_index": res["productivity_index"],
    }


def nodal_chart(reservoir, wellbore_p, r_hot, t_zone, unit, pump, rho_oil,
                spm_list=(1.5, 2.5, 3.5, 5.0, 6.5), plunger_stroke_m=None):
    """Data for the classic nodal plot: IPR plus pump-capacity lines."""
    ipr = reservoir.ipr_curve(r_hot, t_zone, n=40)
    stroke = plunger_stroke_m or unit.stroke
    p_top = max(p["p_wf_kpa"] for p in ipr)

    capacity_lines = []
    for spm in spm_list:
        q = pump.area * stroke * spm * 1440.0 * BBL_PER_M3
        capacity_lines.append({
            "spm": spm,
            "q_bpd": round(q, 2),
            "points": [{"q_bpd": round(q, 2), "p_wf_kpa": 0.0},
                       {"q_bpd": round(q, 2), "p_wf_kpa": round(p_top, 1)}],
        })

    op = solve_operating_point(
        reservoir, wellbore_p, r_hot, t_zone,
        pump.area * stroke * spm_list[len(spm_list) // 2] * 1440.0,
        rho_oil,
    )
    return {
        "ipr": ipr,
        "pump_capacity": capacity_lines,
        "operating_point": {
            "q_bpd": round(op["q_liquid_m3d"] * BBL_PER_M3, 2),
            "p_wf_kpa": round(op["p_wf_kpa"], 1),
            "limited_by": op["limited_by"],
        },
        "absolute_open_flow_bpd": round(
            reservoir.absolute_open_flow(r_hot, t_zone), 2),
    }
