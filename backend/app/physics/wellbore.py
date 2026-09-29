"""
Wellbore module - the "well-to-surface" link of the digital twin.

Two things happen between the sandface and the stuffing box that dominate a
heavy-oil beam-pumped well and that a reservoir-only model misses entirely:

1. The produced fluid COOLS as it rises. Late in a CSS cycle the pump intake
   may still be at 90 C while the top of the rod string is swimming in 35 C
   crude at several thousand centipoise. Rod drag is set by that cold column,
   not by the reservoir temperature - so the drag is computed from a Ramey
   temperature profile integrated along the string.

2. The rod string and the produced flow share the same annulus. Treating rod
   drag (Couette) and tubing friction (Poiseuille) separately double-counts:
   an upward-moving rod already pumps fluid. Both are therefore obtained from
   the exact concentric-annulus solution with the correct flow constraint.
"""
from __future__ import annotations

import math

from .fluids import G_ACC, water_density


# ============================================================================
# exact concentric annulus: inner cylinder translating + imposed net flow
# ============================================================================
def _annulus_profile_constants(a, b, mu, v_rod, g_grad):
    """Integration constants for u(r) = -G r^2/(4mu) + C1 ln r + C2."""
    lam = math.log(b / a)
    c1 = (g_grad * (b * b - a * a) / (4.0 * mu) - v_rod) / lam
    c2 = g_grad * b * b / (4.0 * mu) - c1 * math.log(b)
    return c1, c2


def _annulus_flow(a, b, mu, v_rod, g_grad):
    """Volumetric flow [m3/s] through the annulus for a given dP/dz."""
    c1, c2 = _annulus_profile_constants(a, b, mu, v_rod, g_grad)
    i_r3 = (b ** 4 - a ** 4) / 4.0
    i_rlnr = (b * b * math.log(b) - a * a * math.log(a)) / 2.0 \
        - (b * b - a * a) / 4.0
    i_r = (b * b - a * a) / 2.0
    return 2.0 * math.pi * (
        -g_grad / (4.0 * mu) * i_r3 + c1 * i_rlnr + c2 * i_r
    )


def annulus_rod_drag(a, b, mu, length, v_rod, q_required):
    """Axial force on the rod string and the friction gradient.

    Parameters
    ----------
    a, b        rod radius and tubing inner radius [m]
    mu          fluid viscosity [Pa.s]
    length      length over which this applies [m]
    v_rod       rod axial velocity, positive up [m/s]
    q_required  net fluid volume flux that must pass a fixed plane [m3/s]

    Returns
    -------
    (force_n, dpdz_pa_per_m)
        ``force_n`` is positive up; it opposes ``v_rod``.
    """
    if b <= a * 1.001 or mu <= 0:
        return 0.0, 0.0
    q0 = _annulus_flow(a, b, mu, v_rod, 0.0)
    q1 = _annulus_flow(a, b, mu, v_rod, 1.0)
    dq_dg = q1 - q0
    g_grad = 0.0 if abs(dq_dg) < 1e-30 else (q_required - q0) / dq_dg

    c1, _ = _annulus_profile_constants(a, b, mu, v_rod, g_grad)
    dudr_a = -g_grad * a / (2.0 * mu) + c1 / a
    force = 2.0 * math.pi * a * length * mu * dudr_a
    # g_grad > 0 means a pressure gradient is needed to drive the flow, i.e.
    # friction the pump has to pay for. g_grad < 0 means the rod's own Couette
    # transport already over-pumps the section.
    return force, g_grad


# ============================================================================
# temperature profile
# ============================================================================
class WellboreThermal:
    """Ramey-type steady temperature profile for the produced column."""

    def __init__(self, pump_depth_m=680.0, surface_temp_c=30.0,
                 geothermal_grad_c_per_m=0.028, tubing_od_m=0.0730,
                 u_overall=8.0):
        self.depth = pump_depth_m
        self.t_surface = surface_temp_c
        self.grad = geothermal_grad_c_per_m
        self.r_tubing = tubing_od_m / 2.0
        self.u = u_overall

    def earth_temp(self, z):
        """Undisturbed formation temperature at depth z [m below surface]."""
        return self.t_surface + self.grad * z

    def relaxation_distance(self, mass_rate_kg_s, cp=2100.0):
        """Ramey relaxation distance A [m]. Low rate -> short A -> fast cooling."""
        denom = 2.0 * math.pi * self.r_tubing * self.u
        return max(mass_rate_kg_s * cp / max(denom, 1e-9), 1.0)

    def profile(self, t_intake_c, mass_rate_kg_s, n=25):
        """Fluid temperature from the pump (z=depth) up to surface (z=0)."""
        a = self.relaxation_distance(mass_rate_kg_s)
        pts = []
        for i in range(n + 1):
            z = self.depth * (1.0 - i / n)          # depth, surface last
            s = self.depth - z                       # distance travelled up
            decay = math.exp(-s / a)
            t = (self.earth_temp(z) + self.grad * a * (1.0 - decay)
                 + (t_intake_c - self.earth_temp(self.depth)) * decay)
            pts.append({"depth_m": z, "temp_c": t})
        return pts

    def wellhead_temp(self, t_intake_c, mass_rate_kg_s):
        return self.profile(t_intake_c, mass_rate_kg_s, n=2)[-1]["temp_c"]


def effective_drag_viscosity(rods, thermal, visc_model, t_intake_c,
                             mass_rate_kg_s, tubing_id_m, n_slices=24):
    """Drag-weighted mean viscosity seen by the rod string [cP].

    Each slice contributes to the Couette drag in proportion to
    ``2*pi*L_i / ln(Dt/Dr_i)``, so the weighting is the true drag weighting
    rather than a plain arithmetic average over depth.
    """
    prof = thermal.profile(t_intake_c, mass_rate_kg_s, n=n_slices)
    # depth -> temperature lookup, shallow first
    prof_sorted = sorted(prof, key=lambda p: p["depth_m"])

    def temp_at(depth):
        for i in range(len(prof_sorted) - 1):
            d0, d1 = prof_sorted[i]["depth_m"], prof_sorted[i + 1]["depth_m"]
            if d0 <= depth <= d1:
                f = (depth - d0) / max(d1 - d0, 1e-9)
                return (prof_sorted[i]["temp_c"] * (1 - f)
                        + prof_sorted[i + 1]["temp_c"] * f)
        return prof_sorted[-1]["temp_c"]

    num = den = 0.0
    top = 0.0
    for taper in rods.tapers:
        seg = taper.length / 6.0
        w_unit = 2.0 * math.pi / math.log(max(tubing_id_m / taper.d, 1.05))
        for k in range(6):
            d_mid = top + seg * (k + 0.5)
            mu = visc_model.mu_oil(temp_at(d_mid))
            num += w_unit * seg * mu
            den += w_unit * seg
        top += taper.length
    return num / max(den, 1e-9)


# ============================================================================
# pressure traverse / fluid level
# ============================================================================
class WellborePressure:
    """Static and flowing pressures around the pump."""

    def __init__(self, pump_depth_m=680.0, casing_head_kpa=250.0,
                 tubing_head_kpa=450.0, perforation_depth_m=700.0):
        self.pump_depth = pump_depth_m
        self.p_casing = casing_head_kpa
        self.p_tubing = tubing_head_kpa
        self.perf_depth = perforation_depth_m

    def intake_pressure(self, fluid_level_m, rho_annulus):
        """Pump intake pressure [kPa] from the annular fluid column."""
        submergence = max(self.pump_depth - fluid_level_m, 0.0)
        return self.p_casing + rho_annulus * G_ACC * submergence / 1000.0

    def fluid_level_from_pwf(self, p_wf_kpa, rho_annulus):
        """Working fluid level [m below surface] implied by a given P_wf."""
        head = (p_wf_kpa - self.p_casing) * 1000.0 / (rho_annulus * G_ACC)
        return max(self.perf_depth - head, 0.0)

    def pwf_from_intake(self, p_intake_kpa, rho_annulus):
        """Sandface pressure from pump intake pressure (static column below)."""
        dz = max(self.perf_depth - self.pump_depth, 0.0)
        return p_intake_kpa + rho_annulus * G_ACC * dz / 1000.0

    def discharge_pressure(self, rho_tubing, friction_kpa=0.0):
        """Pressure above the plunger [kPa]."""
        return (self.p_tubing
                + rho_tubing * G_ACC * self.pump_depth / 1000.0
                + max(friction_kpa, 0.0))


def mixture_density(water_cut, rho_oil, t_c):
    return water_cut * water_density(t_c) + (1.0 - water_cut) * rho_oil

# BaghewalaOS API adapter: deterministic thermal and pressure summary.
from dataclasses import dataclass
from .fluids import ViscosityModel, BBL_PER_M3, OIL_CP

@dataclass
class WellboreState:
    intake_pressure_bar: float
    fluid_level_m: float
    average_viscosity_cp: float
    heat_loss_mj: float
    wellhead_temperature_c: float
    provenance: str = "SYNTHETIC"
    physics_source: str = "WagheraOS wellbore thermal + pressure correlations"


def simulate_wellbore(meta, css, oil_rate) -> WellboreState:
    wc = max(0.05, min(0.25, 0.12 * (1.0 + 0.35 * (meta.fingerprint.asphaltene_tendency - 0.3))))
    visc = ViscosityModel(api=meta.fingerprint.api_gravity,
                          anchor_lo=(47.0, 1500.0), anchor_hi=(200.0, 12.0))
    rho_oil = visc.density(css.reservoir_temperature_c)
    rho_mix = mixture_density(wc, rho_oil, css.reservoir_temperature_c)
    pump_depth = 680.0
    p = WellborePressure(pump_depth_m=pump_depth, casing_head_kpa=250.0,
                         tubing_head_kpa=450.0, perforation_depth_m=min(meta.depth_m, 700.0))
    thermal = WellboreThermal(
        pump_depth_m=pump_depth, surface_temp_c=32.0,
        geothermal_grad_c_per_m=(css.reservoir_temperature_c - 32.0) / pump_depth,
    )
    p_wf = max(css.pressure_bar * 100.0, 650.0)
    head = max((p_wf - p.p_casing) * 1000.0 / max(rho_mix * G_ACC, 1e-9), 0.0)
    level = max(0.0, min(pump_depth, pump_depth - head))
    p_intake = p.intake_pressure(level, rho_mix)
    q_m3s = max(oil_rate, 0.0) / BBL_PER_M3 / 86400.0
    mass_rate = q_m3s * rho_mix
    profile = thermal.profile(css.reservoir_temperature_c, mass_rate, n=24)
    mu_avg = sum(visc.mu_oil(x["temp_c"]) for x in profile) / max(len(profile), 1)
    t_wh = thermal.wellhead_temp(css.reservoir_temperature_c, mass_rate)
    heat = max(0.0, mass_rate * OIL_CP * (css.reservoir_temperature_c - t_wh) * 86400.0 / 1e6)
    return WellboreState(
        intake_pressure_bar=round(p_intake / 100.0, 3),
        fluid_level_m=round(level, 2),
        average_viscosity_cp=round(mu_avg, 2),
        heat_loss_mj=round(heat, 3),
        wellhead_temperature_c=round(t_wh, 2),
    )
