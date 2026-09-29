"""
Reservoir inflow and pressure model for a cyclically-steamed heavy-oil well.

The near-well system is treated as two communicating regions:

    +---------------------------- cold reservoir (P_res, mu_cold) ----------+
    |                                                                       |
    |         +------------- heated zone (P_zone, mu_hot, r_h) ------+      |
    |         |                        (o) well                      |      |
    |         +-----------------------------------------------------+       |
    +-----------------------------------------------------------------------+

Oil reaching the well must cross the hot region only, so the productivity
index jumps by orders of magnitude after a steam slug. The heated zone is
also a small tank that is re-pressured by injection and blows down during
production - that combination (falling pressure AND rising viscosity as the
zone cools) is what produces the characteristic CSS decline curve.
"""
from __future__ import annotations

import math

from .fluids import BBL_PER_M3, ViscosityModel, water_viscosity

MD_TO_M2 = 9.869233e-16


class ReservoirModel:
    """Composite radial inflow with a heated-zone material balance."""

    def __init__(
        self,
        perm_md=200.0,
        pay_thickness=6.0,
        porosity=0.26,
        drainage_radius=150.0,
        well_radius=0.1,
        skin=2.0,
        p_res_initial=5500.0,        # kPa abs
        p_bubble=2200.0,             # kPa abs
        t_res=47.0,
        total_compressibility=1.2e-6,  # 1/kPa, heated-zone liquid + rock
        field_compressibility=1.5e-5,  # 1/kPa, drainage volume incl. free gas
        oil_saturation=0.72,
        connate_water=0.28,
        visc=None,
    ):
        self.k = perm_md * MD_TO_M2
        self.perm_md = perm_md
        self.h = pay_thickness
        self.phi = porosity
        self.re = drainage_radius
        self.rw = well_radius
        self.skin = skin
        self.p_res = p_res_initial
        self.p_res_initial = p_res_initial
        self.p_bubble = p_bubble
        self.t_res = t_res
        self.ct = total_compressibility
        self.ct_field = field_compressibility
        self.so = oil_saturation
        self.swc = connate_water
        self.visc = visc or ViscosityModel()

        # heated-zone tank state
        self.p_zone = p_res_initial
        self.steam_saturation = 0.0      # gas-phase fraction in the heated zone
        self.steam_saturation_0 = 0.0
        self.energy_at_injection = 1.0   # J, for tracking steam condensation
        self.condensate_in_place = 0.0   # m3 of condensed steam still to return
        self.condensate_bank_initial = 0.0
        self.slug_volume_m3 = 0.0        # m3 CWE injected this cycle
        self.cycle_liquid_m3 = 0.0       # liquid produced since the slug
        # fraction of an injected slug that returns during the same cycle;
        # the balance is left behind the condensation front
        self.condensate_return_fraction = 0.45
        self.cum_oil = 0.0               # m3
        self.cum_water = 0.0             # m3

    # ------------------------------------------------------------------
    # productivity indices
    # ------------------------------------------------------------------
    def j_hot(self, r_hot, mu_hot_cp):
        """PI [m3/s/Pa] from the heated-zone boundary to the wellbore."""
        r_hot = max(r_hot, self.rw * 1.5)
        mu = max(mu_hot_cp, 0.1) * 1e-3           # cP -> Pa.s
        denom = mu * (math.log(r_hot / self.rw) + self.skin)
        return 2.0 * math.pi * self.k * self.h / max(denom, 1e-12)

    def j_cold(self, r_hot, mu_cold_cp):
        """PI [m3/s/Pa] for influx from the cold reservoir into the hot zone."""
        r_hot = max(min(r_hot, self.re * 0.95), self.rw * 1.5)
        mu = max(mu_cold_cp, 0.1) * 1e-3
        denom = mu * math.log(self.re / r_hot)
        return 2.0 * math.pi * self.k * self.h / max(denom, 1e-12)

    def j_cold_direct(self, mu_cold_cp):
        """PI of the unstimulated (never-steamed) well - the CSS baseline."""
        mu = max(mu_cold_cp, 0.1) * 1e-3
        denom = mu * (math.log(self.re / self.rw) + self.skin)
        return 2.0 * math.pi * self.k * self.h / max(denom, 1e-12)

    # ------------------------------------------------------------------
    # inflow performance
    # ------------------------------------------------------------------
    def composite_rate(self, j, p_out, p_wf):
        """Composite (Darcy + Vogel) inflow rate [m3/s] for a given PI.

        Above the bubble point the flow is single-phase and follows a straight
        productivity line. Below it, liberated gas takes up pore space and the
        curve bends over into Vogel's quadratic:

            p_wf >= p_b :  q = J (p_out - p_wf)
            p_wf <  p_b :  q = J (p_out - p_b)
                             + (J p_b / 1.8) [1 - 0.2 x - 0.8 x^2],  x = p_wf/p_b

        The two pieces meet with matching value at p_b, and the result is
        monotonic all the way down to the absolute open flow - which a naive
        "Vogel as a multiplier" form is not.
        """
        pb = min(self.p_bubble, p_out)
        if p_wf >= pb:
            draw = max(p_out - p_wf, 0.0) * 1000.0
            return j * draw
        above = max(p_out - pb, 0.0) * 1000.0
        x = max(min(p_wf / max(pb, 1e-9), 1.0), 0.0)
        vogel = 1.0 - 0.2 * x - 0.8 * x * x
        return j * (above + pb * 1000.0 * vogel / 1.8)

    def inflow(self, p_wf, r_hot, t_zone, water_cut_hint=None):
        """Liquid inflow at a given flowing bottomhole pressure.

        Returns a dict with rates in m3/d and the PI actually in force.
        ``p_wf`` and pressures are kPa absolute.
        """
        mu_hot = self.visc.mu_oil(max(t_zone, self.t_res))
        mu_cold = self.visc.mu_oil(self.t_res)

        stimulated = r_hot > self.rw * 2.0
        if stimulated:
            j = self.j_hot(r_hot, mu_hot)
            p_out = self.p_zone
        else:
            j = self.j_cold_direct(mu_cold)
            p_out = self.p_res

        q_liq = self.composite_rate(j, p_out, p_wf)   # m3/s
        q_liq_d = q_liq * 86400.0

        wc = water_cut_hint if water_cut_hint is not None else self.water_cut()
        return {
            "q_liquid_m3d": q_liq_d,
            "q_oil_m3d": q_liq_d * (1.0 - wc),
            "q_water_m3d": q_liq_d * wc,
            "q_oil_bpd": q_liq_d * (1.0 - wc) * BBL_PER_M3,
            "q_liquid_bpd": q_liq_d * BBL_PER_M3,
            "productivity_index": j,
            "mu_hot_cp": mu_hot,
            "mu_cold_cp": mu_cold,
            "p_outer_kpa": p_out,
            "water_cut": wc,
            "stimulated": stimulated,
        }

    def ipr_curve(self, r_hot, t_zone, n=40):
        """IPR points for the nodal-analysis chart."""
        p_out = self.p_zone if r_hot > self.rw * 2.0 else self.p_res
        pts = []
        for i in range(n + 1):
            p_wf = p_out * i / n
            res = self.inflow(p_wf, r_hot, t_zone)
            pts.append(
                {
                    "p_wf_kpa": round(p_wf, 1),
                    "q_liquid_bpd": round(res["q_liquid_bpd"], 2),
                    "q_oil_bpd": round(res["q_oil_bpd"], 2),
                }
            )
        return pts

    def absolute_open_flow(self, r_hot, t_zone):
        return self.inflow(0.0, r_hot, t_zone)["q_liquid_bpd"]

    # ------------------------------------------------------------------
    # water cut: connate water plus returning steam condensate
    # ------------------------------------------------------------------
    def water_cut(self):
        """Connate water plus the returning steam-condensate flush.

        A CSS well comes back almost all water and cleans up as the condensate
        around the wellbore is swept out. The decay is therefore keyed to the
        LIQUID VOLUME already produced this cycle relative to the slug size -
        not to an absolute bank, which would imply a well can always produce
        back everything that was injected.
        """
        base = 0.30
        if self.slug_volume_m3 <= 1.0:
            return base
        scale = self.condensate_return_fraction * self.slug_volume_m3 / 3.0
        frac = self.cycle_liquid_m3 / max(scale, 1.0)
        extra = 0.62 * math.exp(-frac)
        return max(min(base + extra, 0.92), base)

    # ------------------------------------------------------------------
    # material balance
    # ------------------------------------------------------------------
    def zone_pore_volume(self, r_hot):
        return math.pi * max(r_hot, self.rw) ** 2 * self.h * self.phi

    def effective_compressibility(self):
        """Total compressibility of the heated zone [1/kPa].

        A steam-swept zone is not a stiff liquid tank. While a gas phase is
        present its compressibility is roughly 1/P, which dominates the rock
        and liquid terms by one to two orders of magnitude and is what lets a
        CSS cycle produce for months rather than days. As the zone cools the
        steam condenses, ct collapses back to the liquid value, and the well
        dies - the natural end of the cycle.
        """
        c_liquid = self.ct                       # rock + oil + water
        c_gas = self.steam_saturation / max(self.p_zone, 100.0)
        return c_liquid + c_gas

    def update_steam_saturation(self, energy_fraction):
        """Steam condenses in proportion to the heat lost from the zone."""
        self.steam_saturation = max(
            self.steam_saturation_0 * max(min(energy_fraction, 1.0), 0.0), 0.0
        )

    def charge_from_injection(self, steam_mass_kg, p_injection, r_hot,
                              zone_energy_j=1.0):
        """Apply the pressure, steam phase and condensate left by a slug."""
        self.p_zone = max(p_injection, self.p_res)
        self.condensate_in_place += (steam_mass_kg / 1000.0
                                     * self.condensate_return_fraction)
        self.condensate_bank_initial = max(self.condensate_in_place, 1.0)
        self.slug_volume_m3 = steam_mass_kg / 1000.0
        self.cycle_liquid_m3 = 0.0
        # a steam-swept zone is left at high gas saturation
        self.steam_saturation_0 = 0.38
        self.steam_saturation = 0.38
        self.energy_at_injection = max(zone_energy_j, 1.0)

    def step(self, dt_seconds, q_oil_m3d, q_water_m3d, r_hot, t_zone,
             dt_zone_per_s=0.0):
        """Advance zone pressure, cumulative volumes and condensate bank."""
        dt_days = dt_seconds / 86400.0
        vp = self.zone_pore_volume(r_hot)
        if vp <= 0:
            return

        mu_cold = self.visc.mu_oil(self.t_res)
        q_influx = (self.j_cold(r_hot, mu_cold)
                    * max(self.p_res - self.p_zone, 0.0) * 1000.0 * 86400.0)

        q_out = q_oil_m3d + q_water_m3d
        # thermal contraction of the fluid as the zone cools acts as a sink
        beta = 7.0e-4                       # 1/degC, mixed oil + water
        q_thermal = vp * beta * dt_zone_per_s * 86400.0

        dv = (q_influx - q_out + q_thermal) * dt_days
        ct_eff = self.effective_compressibility()
        self.p_zone = max(self.p_zone + dv / max(ct_eff * vp, 1e-9), 150.0)

        self.cum_oil += q_oil_m3d * dt_days
        self.cum_water += q_water_m3d * dt_days
        self.cycle_liquid_m3 += q_out * dt_days
        # condensate bank drains with the produced water
        self.condensate_in_place = max(
            self.condensate_in_place - q_water_m3d * 0.8 * dt_days, 0.0
        )
        # Slow depletion of the far-field average pressure. This has to be
        # taken against the WHOLE drainage pore volume, not the heated zone -
        # charging a few hundred cubic metres of production against the small
        # near-well volume would collapse the reservoir pressure inside a
        # single cycle and kill every cycle after the first.
        vp_drainage = math.pi * self.re ** 2 * self.h * self.phi
        self.p_res = max(
            self.p_res - (q_out * dt_days) / max(self.ct_field * vp_drainage,
                                                 1e-9),
            500.0,
        )

    def snapshot(self):
        return {
            "p_zone_kpa": round(self.p_zone, 1),
            "p_res_kpa": round(self.p_res, 1),
            "cum_oil_m3": round(self.cum_oil, 2),
            "cum_oil_bbl": round(self.cum_oil * BBL_PER_M3, 1),
            "cum_water_m3": round(self.cum_water, 2),
            "condensate_bank_m3": round(self.condensate_in_place, 1),
            "steam_saturation": round(self.steam_saturation, 3),
        }
