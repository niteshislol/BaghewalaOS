"""
The well-to-surface digital twin.

One object owns the whole chain - reservoir thermal state, near-well pressure,
wellbore temperature profile and the beam pump - and marches it through the
Cyclic Steam Stimulation cycle:

    INJECTION  ->  SOAK  ->  PRODUCTION  ->  (next cycle)

Every timestep the coupling runs in both directions:

    heat  ->  viscosity  ->  inflow  ->  rate  ->  pump loading
      ^                                              |
      +------- produced-fluid enthalpy removal -------+

which is what makes it a twin rather than two separate models bolted together.
"""
from __future__ import annotations

import copy
import math
import threading
from dataclasses import dataclass, field, asdict

from ..physics.fluids import (BBL_PER_M3, ViscosityModel, injected_heat_rate,
                              steam_sat_temp, water_enthalpy, latent_heat)
from ..physics.nodal import solve_operating_point
from ..physics.reservoir import MD_TO_M2, ReservoirModel
from ..physics.srp import (LBF_PER_N, Pump, PumpingUnit, RodString, RodTaper,
                           SRPOperatingPoint)
from ..physics.thermal import HeatedZone, OverburdenProps, ramey_wellbore_loss
from ..physics.wellbore import (WellborePressure, WellboreThermal,
                                effective_drag_viscosity, mixture_density)

DAY = 86400.0


# ============================================================================
# configuration
# ============================================================================
@dataclass
class CSSParams:
    """The four decision variables the optimiser is allowed to move."""

    steam_tonnes: float = 1800.0        # slug size per cycle
    injection_rate_tpd: float = 180.0   # tonnes/day -> sets injection days
    injection_pressure_kpa: float = 7000.0
    steam_quality: float = 0.80
    soak_days: float = 7.0
    cutoff_rate_bopd: float = 3.0       # abandon the cycle below this
    max_production_days: float = 220.0


@dataclass
class SRPParams:
    """Surface-unit settings the real-time controller is allowed to move."""

    spm: float = 4.0
    stroke_m: float = 2.54
    vfd_enabled: bool = True
    downstroke_speed_ratio: float = 1.0   # <1 slows the downstroke (anti-float)
    min_spm: float = 1.0
    max_spm: float = 8.0


@dataclass
class Economics:
    oil_price_inr_per_bbl: float = 6800.0
    gas_price_inr_per_mmbtu: float = 950.0
    power_price_inr_per_kwh: float = 8.0
    boiler_efficiency: float = 0.82
    feedwater_temp_c: float = 60.0
    water_handling_inr_per_m3: float = 120.0
    fixed_opex_inr_per_day: float = 9000.0
    rod_workover_cost_inr: float = 850000.0


@dataclass
class WellConfig:
    """Static description of one Baghewala-type well."""

    well_id: str = "BGW-07"
    field_name: str = "Baghewala"
    # reservoir
    api_gravity: float = 18.0
    perm_md: float = 200.0
    pay_thickness_m: float = 6.0
    porosity: float = 0.26
    drainage_radius_m: float = 150.0
    skin: float = 2.0
    p_res_initial_kpa: float = 5500.0
    t_res_c: float = 47.0
    # viscosity calibration anchors (lab PVT)
    mu_anchor_lo: tuple = (47.0, 1500.0)
    mu_anchor_hi: tuple = (200.0, 12.0)
    # completion
    perf_depth_m: float = 700.0
    pump_depth_m: float = 680.0
    tubing_id_in: float = 2.441
    tubing_anchored: bool = True
    casing_head_kpa: float = 250.0
    tubing_head_kpa: float = 450.0
    surface_temp_c: float = 30.0
    # equipment
    plunger_diameter_in: float = 1.75
    rod_taper: tuple = ((0.875, 300.0), (0.75, 380.0))
    rod_grade: str = "D"
    stroke_m: float = 2.54
    pitman_m: float = 3.65
    gearbox_rating_nm: float = 64000.0
    structural_rating_n: float = 155000.0


# ============================================================================
# the twin
# ============================================================================
class CSSDigitalTwin:
    """Time-stepping well-to-surface twin for one well."""

    def __init__(self, config=None, css=None, srp=None, econ=None):
        self.cfg = config or WellConfig()
        self.css = css or CSSParams()
        self.srp = srp or SRPParams()
        self.econ = econ or Economics()
        self._lock = threading.RLock()
        self._pending = {}
        self.last_change = None
        self.build()

    # ------------------------------------------------------------------
    def build(self):
        self.rebuild_derived(fresh=True)
        self.reset_state()

    # ------------------------------------------------------------------
    def rebuild_derived(self, fresh=False):
        """Re-create everything derived from the parameter set.

        With fresh=False the reservoir and heated-zone objects are mutated
        in place instead of replaced, so a parameter change mid-run keeps
        the simulation state - zone temperature and size, pressures,
        cumulative volumes, the cycle clock. That is what lets an operator
        turn a knob on a running well and watch the answer move, instead
        of restarting the well every time.
        """
        c = self.cfg
        self.visc = ViscosityModel(api=c.api_gravity,
                                   anchor_lo=tuple(c.mu_anchor_lo),
                                   anchor_hi=tuple(c.mu_anchor_hi))
        if fresh:
            self.zone = HeatedZone(t_res=c.t_res_c,
                                   pay_thickness=c.pay_thickness_m,
                                   ob=OverburdenProps())
            self.zone.temperature = c.t_res_c
            self.res = ReservoirModel(
                perm_md=c.perm_md, pay_thickness=c.pay_thickness_m,
                porosity=c.porosity, drainage_radius=c.drainage_radius_m,
                skin=c.skin, p_res_initial=c.p_res_initial_kpa,
                t_res=c.t_res_c, visc=self.visc,
            )
        else:
            z = self.zone
            z.t_res = c.t_res_c
            z.pay_thickness = c.pay_thickness_m
            z.temperature = max(z.temperature, c.t_res_c)
            r = self.res
            r.perm_md = c.perm_md
            r.k = c.perm_md * MD_TO_M2
            r.h = c.pay_thickness_m
            r.phi = c.porosity
            r.re = c.drainage_radius_m
            r.skin = c.skin
            r.t_res = c.t_res_c
            r.visc = self.visc
        self.wb_thermal = WellboreThermal(
            pump_depth_m=c.pump_depth_m, surface_temp_c=c.surface_temp_c,
            geothermal_grad_c_per_m=(c.t_res_c - c.surface_temp_c)
            / max(c.perf_depth_m, 1.0),
        )
        self.wb_press = WellborePressure(
            pump_depth_m=c.pump_depth_m, casing_head_kpa=c.casing_head_kpa,
            tubing_head_kpa=c.tubing_head_kpa,
            perforation_depth_m=c.perf_depth_m,
        )
        self.unit = PumpingUnit(self.srp.stroke_m, c.pitman_m,
                                c.gearbox_rating_nm, c.structural_rating_n)
        self.rods = RodString([RodTaper(d, l) for d, l in c.rod_taper],
                              grade=c.rod_grade)
        self.pump = Pump(plunger_diameter_in=c.plunger_diameter_in,
                         setting_depth_m=c.pump_depth_m)
        self.tubing_id_m = c.tubing_id_in * 0.0254

    # ------------------------------------------------------------------
    def __deepcopy__(self, memo):
        """Copy the twin for what-if runs.

        The lock is per-object and not copyable, so the clone gets a fresh
        one; everything else - physics objects, cycle state, history - is
        deep-copied so a preview can never disturb the live well.
        """
        clone = self.__class__.__new__(self.__class__)
        memo[id(self)] = clone
        for key, value in self.__dict__.items():
            if key == "_lock":
                clone._lock = threading.RLock()
            else:
                setattr(clone, key, copy.deepcopy(value, memo))
        return clone

    # ------------------------------------------------------------------
    def vfd_ratios(self):
        """Down/up stroke speed factors, and the SPM they actually deliver.

        A variable-speed drive can run the downstroke slower than the
        upstroke. Rod drag scales with velocity, so that buys float margin;
        speeding the upstroke recovers most of the strokes per minute the
        slower downstroke would otherwise cost.
        """
        ds = max(min(self.srp.downstroke_speed_ratio, 1.0), 0.3)
        if ds >= 0.999:
            return 1.0, 1.0, self.srp.spm
        us = min(1.6, 1.0 / max(2.0 - 1.0 / ds, 0.55))
        eff = 2.0 * self.srp.spm / (1.0 / us + 1.0 / ds)
        return ds, us, eff

    # ------------------------------------------------------------------
    def queue_update(self, patch):
        """Stage a parameter change; it lands at the top of the next step.

        Applying it between steps rather than inside one keeps the physics
        self-consistent within a timestep even while the twin is streaming.
        """
        with self._lock:
            self._pending.update(patch or {})

    def apply_pending(self):
        """Apply any staged parameter change. Returns what landed."""
        with self._lock:
            if not self._pending:
                return None
            patch, self._pending = self._pending, {}
        from ..params import apply_patch
        applied, rejected = apply_patch(self, patch)
        self.last_change = {"applied": applied, "rejected": rejected}
        return self.last_change

    # ------------------------------------------------------------------
    def reset_state(self):
        """Clear the simulation clock and all accumulators."""
        # cycle bookkeeping
        self.state = "IDLE"
        self.day = 0.0
        self.cycle = 0
        self.cycle_day = 0.0
        self.inject_seconds = 0.0
        self.steam_injected_t = 0.0
        self.cycle_steam_t = 0.0
        self.cycle_oil_m3 = 0.0
        self.cycle_water_m3 = 0.0
        self.cycle_energy_kwh = 0.0
        self.cum_oil_m3 = 0.0
        self.cum_steam_t = 0.0
        self.cum_energy_kwh = 0.0
        self.float_hours = 0.0
        self.history = []
        self.cycle_summaries = []
        self._last_zone_temp = self.zone.temperature

    # ------------------------------------------------------------------
    # derived quantities
    # ------------------------------------------------------------------
    @property
    def t_steam(self):
        return steam_sat_temp(self.css.injection_pressure_kpa)

    def steam_energy_per_tonne_gj(self):
        e = self.cfg  # noqa
        h = (water_enthalpy(self.t_steam)
             - water_enthalpy(self.econ.feedwater_temp_c)
             + self.css.steam_quality * latent_heat(self.t_steam))
        return h * 1000.0 / 1e6 / self.econ.boiler_efficiency   # GJ per tonne

    def steam_cost_per_tonne(self):
        gj = self.steam_energy_per_tonne_gj()
        mmbtu = gj * 0.947817
        return mmbtu * self.econ.gas_price_inr_per_mmbtu

    # ------------------------------------------------------------------
    # cycle control
    # ------------------------------------------------------------------
    def start_cycle(self):
        self.cycle += 1
        self.state = "INJECTION"
        self.cycle_day = 0.0
        self.inject_seconds = 0.0
        self.cycle_steam_t = 0.0
        self.cycle_oil_m3 = 0.0
        self.cycle_water_m3 = 0.0
        self.cycle_energy_kwh = 0.0
        self.float_hours = 0.0

    def _finish_cycle(self):
        sor = (self.cycle_steam_t / max(self.cycle_oil_m3, 1e-6))
        oil_bbl = self.cycle_oil_m3 * BBL_PER_M3
        revenue = oil_bbl * self.econ.oil_price_inr_per_bbl
        steam_cost = self.cycle_steam_t * self.steam_cost_per_tonne()
        power_cost = self.cycle_energy_kwh * self.econ.power_price_inr_per_kwh
        water_cost = self.cycle_water_m3 * self.econ.water_handling_inr_per_m3
        fixed = self.cycle_day * self.econ.fixed_opex_inr_per_day
        summary = {
            "cycle": self.cycle,
            "days": round(self.cycle_day, 1),
            "steam_tonnes": round(self.cycle_steam_t, 1),
            "oil_m3": round(self.cycle_oil_m3, 2),
            "oil_bbl": round(oil_bbl, 1),
            "water_m3": round(self.cycle_water_m3, 2),
            "sor_t_per_m3": round(sor, 2),
            "sor_bbl_per_bbl": round(
                self.cycle_steam_t / max(self.cycle_oil_m3, 1e-6), 2),
            "energy_kwh": round(self.cycle_energy_kwh, 0),
            "kwh_per_bbl": round(self.cycle_energy_kwh / max(oil_bbl, 1e-6), 3),
            "revenue_inr": round(revenue, 0),
            "steam_cost_inr": round(steam_cost, 0),
            "power_cost_inr": round(power_cost, 0),
            "net_inr": round(revenue - steam_cost - power_cost
                             - water_cost - fixed, 0),
            "float_hours": round(self.float_hours, 1),
        }
        self.cycle_summaries.append(summary)
        return summary

    # ------------------------------------------------------------------
    # one timestep
    # ------------------------------------------------------------------
    def step(self, dt_days=0.25, record=True):
        """Advance one timestep.

        The whole timestep is taken under the twin's lock so a parameter
        change arriving from the API cannot land halfway through the
        physics and leave the step reading a half-rebuilt rod string.
        """
        with self._lock:
            self.apply_pending()
            return self._step_locked(dt_days, record)

    def _step_locked(self, dt_days=0.25, record=True):
        dt = dt_days * DAY
        self.day += dt_days
        self.cycle_day += dt_days
        prev_temp = self.zone.temperature

        if self.state == "IDLE":
            self.start_cycle()

        rec = {"day": round(self.day, 3), "cycle": self.cycle,
               "state": self.state, "cycle_day": round(self.cycle_day, 2)}

        if self.state == "INJECTION":
            rec.update(self._step_injection(dt, dt_days))
        elif self.state == "SOAK":
            rec.update(self._step_soak(dt))
        else:
            rec.update(self._step_production(dt, dt_days))

        self._last_zone_temp = prev_temp
        rec.update(self.zone.snapshot())
        rec.update(self.res.snapshot())
        rec["cum_oil_bbl"] = round(self.cum_oil_m3 * BBL_PER_M3, 1)
        rec["cum_steam_t"] = round(self.cum_steam_t, 1)
        if record:
            self.history.append(rec)
        return rec

    # -- injection -------------------------------------------------------
    def _step_injection(self, dt, dt_days):
        p = self.css
        rate_kg_s = p.injection_rate_tpd * 1000.0 / DAY
        remaining = p.steam_tonnes - self.cycle_steam_t
        this_step_t = min(p.injection_rate_tpd * dt_days, remaining)
        if this_step_t <= 1e-6:
            self.state = "SOAK"
            self.zone.age_since_injection = 0.0
            self.res.charge_from_injection(self.cycle_steam_t * 1000.0,
                                           p.injection_pressure_kpa,
                                           self.zone.radius,
                                           self.zone.stored_energy)
            return {"steam_rate_tpd": 0.0, "q_oil_bpd": 0.0}

        q_surface = injected_heat_rate(rate_kg_s, self.t_steam,
                                       p.steam_quality, self.cfg.t_res_c)
        loss = ramey_wellbore_loss(q_surface, self.cfg.pump_depth_m,
                                   self.t_steam,
                                   0.5 * (self.cfg.surface_temp_c
                                          + self.cfg.t_res_c))
        q_sandface = q_surface * (1.0 - loss)
        self.zone.inject(q_sandface, dt, self.t_steam, self.inject_seconds)
        self.inject_seconds += dt
        self.cycle_steam_t += this_step_t
        self.steam_injected_t += this_step_t
        self.cum_steam_t += this_step_t

        return {
            "steam_rate_tpd": p.injection_rate_tpd,
            "steam_temp_c": round(self.t_steam, 1),
            "wellbore_heat_loss_pct": round(loss * 100.0, 1),
            "q_sandface_mw": round(q_sandface / 1e6, 3),
            "q_oil_bpd": 0.0, "q_water_bpd": 0.0, "spm": 0.0,
            "motor_power_kw": 0.0,
        }

    # -- soak ------------------------------------------------------------
    def _step_soak(self, dt):
        self.zone.step(dt)
        if self.cycle_day >= self._injection_days() + self.css.soak_days:
            self.state = "PRODUCTION"
        return {"q_oil_bpd": 0.0, "q_water_bpd": 0.0, "spm": 0.0,
                "motor_power_kw": 0.0, "steam_rate_tpd": 0.0}

    def _injection_days(self):
        return self.css.steam_tonnes / max(self.css.injection_rate_tpd, 1e-6)

    # -- production ------------------------------------------------------
    def _step_production(self, dt, dt_days, controller=None):
        cfg, srp = self.cfg, self.srp
        t_zone = self.zone.temperature
        rho_oil = self.visc.density(t_zone)

        # 1. pump capacity at the current setting
        stroke_eff = self.unit.stroke * 0.96
        ds, us, eff_spm = self.vfd_ratios()
        q_cap = self.pump.area * stroke_eff * eff_spm * 1440.0

        # 2. nodal balance -> rate, fillage, pressures
        op = solve_operating_point(self.res, self.wb_press, self.zone.radius,
                                   t_zone, q_cap, rho_oil)
        q_liq = op["q_liquid_m3d"]
        q_oil = op["q_oil_m3d"]
        q_wat = op["q_water_m3d"]

        # 3. wellbore thermal -> the viscosity the rods actually swim in
        rho_mix = mixture_density(op["water_cut"], rho_oil, t_zone)
        mass_rate = q_liq * rho_mix / DAY
        t_intake = t_zone
        mu_drag = effective_drag_viscosity(self.rods, self.wb_thermal,
                                           self.visc, t_intake, mass_rate,
                                           self.tubing_id_m)
        t_wh = self.wb_thermal.wellhead_temp(t_intake, mass_rate)

        # 4. rod string / surface unit
        p_dis = self.wb_press.discharge_pressure(rho_mix)
        point = SRPOperatingPoint(self.unit, self.rods, self.pump, srp.spm,
                                  tubing_id_in=cfg.tubing_id_in,
                                  tubing_anchored=cfg.tubing_anchored,
                                  downstroke_ratio=ds, upstroke_ratio=us)
        card = point.solve(mu_drag, rho_mix, p_dis, op["p_intake_kpa"],
                           fillage=op["fillage"], n_points=72)

        # 5. advance reservoir and thermal state
        dtdt = (t_zone - self._last_zone_temp) / max(dt, 1.0)
        # steam condenses as the zone gives up its heat
        self.res.update_steam_saturation(
            self.zone.stored_energy / max(self.res.energy_at_injection, 1.0))
        self.res.step(dt, q_oil, q_wat, self.zone.radius, t_zone,
                      dt_zone_per_s=dtdt)
        self.zone.step(dt, q_oil / DAY, q_wat / DAY, rho_oil)

        # 6. accumulate
        self.cycle_oil_m3 += q_oil * dt_days
        self.cycle_water_m3 += q_wat * dt_days
        self.cum_oil_m3 += q_oil * dt_days
        kwh = card["motor_power_kw"] * 24.0 * dt_days
        self.cycle_energy_kwh += kwh
        self.cum_energy_kwh += kwh
        if card["rod_floating"]:
            self.float_hours += 24.0 * dt_days

        # 7. cycle termination
        q_oil_bpd = q_oil * BBL_PER_M3
        prod_days = self.cycle_day - self._injection_days() - self.css.soak_days
        if (q_oil_bpd < self.css.cutoff_rate_bopd
                or prod_days > self.css.max_production_days):
            self._finish_cycle()
            self.state = "IDLE"

        return {
            "q_oil_bpd": round(q_oil_bpd, 2),
            "q_water_bpd": round(q_wat * BBL_PER_M3, 2),
            "q_liquid_bpd": round(q_liq * BBL_PER_M3, 2),
            "water_cut": round(op["water_cut"], 3),
            "p_wf_kpa": round(op["p_wf_kpa"], 1),
            "p_intake_kpa": round(op["p_intake_kpa"], 1),
            "fluid_level_m": round(op["fluid_level_m"], 1),
            "fillage": round(card["fillage"], 3),
            "limited_by": op["limited_by"],
            "spm": srp.spm,
            "effective_spm": round(card["effective_spm"], 2),
            "downstroke_ratio": ds,
            "mu_zone_cp": round(self.visc.mu_oil(t_zone), 1),
            "mu_drag_cp": round(mu_drag, 1),
            "wellhead_temp_c": round(t_wh, 1),
            "pprl_lbf": round(card["pprl_lbf"], 0),
            "mprl_lbf": round(card["mprl_lbf"], 0),
            "rod_float_index": round(card["rod_float_index"], 4),
            "rod_floating": card["rod_floating"],
            "compression_depth_m": round(card["compression_depth_m"], 1),
            "impact_index": round(card["impact_index"], 3),
            "impact_load_n": round(card["impact_load_n"], 0),
            "goodman_ratio": round(card["goodman_ratio"], 3),
            "motor_power_kw": round(card["motor_power_kw"], 2),
            "gearbox_load_pct": round(card["gearbox_load_pct"], 1),
            "volumetric_efficiency": round(card["volumetric_efficiency"], 3),
            "tubing_friction_kpa": round(card["tubing_friction_kpa"], 0),
            "kwh_per_bbl": round(
                card["motor_power_kw"] * 24.0 / max(q_oil_bpd, 1e-6), 3),
            "steam_rate_tpd": 0.0,
        }

    # ------------------------------------------------------------------
    def run_cycles(self, n_cycles=1, dt_days=0.5, max_days=2000.0,
                   controller=None):
        """Run whole CSS cycles and return the daily history."""
        target = self.cycle + n_cycles
        guard = 0
        while self.cycle < target or self.state != "IDLE":
            if self.state == "IDLE" and self.cycle >= target:
                break
            if controller is not None and self.state == "PRODUCTION":
                controller(self)
            self.step(dt_days)
            guard += 1
            if self.day > max_days or guard > 40000:
                break
        return self.history

    # ------------------------------------------------------------------
    def full_card(self, n_points=180):
        """Full-resolution dynamometer card at the current state."""
        t_zone = self.zone.temperature
        rho_oil = self.visc.density(t_zone)
        stroke_eff = self.unit.stroke * 0.96
        ds, us, eff_spm = self.vfd_ratios()
        q_cap = self.pump.area * stroke_eff * eff_spm * 1440.0
        op = solve_operating_point(self.res, self.wb_press, self.zone.radius,
                                   t_zone, q_cap, rho_oil)
        rho_mix = mixture_density(op["water_cut"], rho_oil, t_zone)
        mass_rate = op["q_liquid_m3d"] * rho_mix / DAY
        mu_drag = effective_drag_viscosity(self.rods, self.wb_thermal,
                                           self.visc, t_zone, mass_rate,
                                           self.tubing_id_m)
        p_dis = self.wb_press.discharge_pressure(rho_mix)
        point = SRPOperatingPoint(self.unit, self.rods, self.pump,
                                  self.srp.spm,
                                  tubing_id_in=self.cfg.tubing_id_in,
                                  tubing_anchored=self.cfg.tubing_anchored,
                                  downstroke_ratio=ds, upstroke_ratio=us)
        card = point.solve(mu_drag, rho_mix, p_dis, op["p_intake_kpa"],
                           fillage=op["fillage"], n_points=n_points)
        card["operating_point"] = op
        card["mu_drag_cp"] = mu_drag
        card["temperature_profile"] = self.wb_thermal.profile(
            t_zone, mass_rate, n=20)
        return card

    def snapshot(self):
        return {
            "well_id": self.cfg.well_id,
            "day": round(self.day, 2),
            "cycle": self.cycle,
            "state": self.state,
            "cycle_day": round(self.cycle_day, 2),
            "spm": self.srp.spm,
            "cum_oil_bbl": round(self.cum_oil_m3 * BBL_PER_M3, 1),
            "cum_steam_t": round(self.cum_steam_t, 1),
            "cum_energy_kwh": round(self.cum_energy_kwh, 0),
            **self.zone.snapshot(),
            **self.res.snapshot(),
        }
