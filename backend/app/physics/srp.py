"""
Sucker-rod pump (beam pump) model: kinematics, rod dynamics, dynamometer
cards, rod-float detection, torque and energy.

The physics that matters for Baghewala is the viscous drag of the rod string
moving through cold, heavy crude inside the tubing:

    F_drag = drag_factor * 2*pi*mu*L*v / ln(Dt/Dr)

On the downstroke that force acts UPWARD, opposing gravity. When it approaches
the buoyant rod weight the rods can no longer fall as fast as the polished rod
-> the string goes into compression, the minimum polished rod load collapses,
and when the slack is taken up again the string sees an impact load. That is
exactly the "rod floating, impact loading, rod failures" chain named in the
problem statement, and it gets worse as the CSS heat front decays.
"""
from __future__ import annotations

import math

from .fluids import G_ACC, STEEL_E, STEEL_RHO
from .wellbore import annulus_rod_drag

IN_TO_M = 0.0254
LBF_PER_N = 0.2248089
PSI_PER_PA = 1.450377e-4
SOUND_SPEED_ROD = 4968.0          # m/s, axial wave speed in steel rods
API_GRADE_TENSILE = {"C": 90000.0, "D": 115000.0, "KD": 115000.0,
                     "HS": 140000.0}   # psi


# ============================================================================
# geometry / equipment
# ============================================================================
class RodTaper:
    """One section of a tapered rod string."""

    def __init__(self, diameter_in, length_m):
        self.d = diameter_in * IN_TO_M
        self.length = length_m
        self.area = math.pi * self.d ** 2 / 4.0

    @property
    def volume(self):
        return self.area * self.length

    @property
    def weight_air(self):
        return self.volume * STEEL_RHO * G_ACC          # N


class RodString:
    """Tapered sucker-rod string."""

    def __init__(self, tapers, grade="D", service_factor=0.9):
        self.tapers = tapers
        self.grade = grade
        self.service_factor = service_factor

    @property
    def length(self):
        return sum(t.length for t in self.tapers)

    @property
    def volume(self):
        return sum(t.volume for t in self.tapers)

    @property
    def weight_air(self):
        return sum(t.weight_air for t in self.tapers)

    @property
    def mass(self):
        return self.volume * STEEL_RHO

    @property
    def top_area(self):
        return self.tapers[0].area

    def buoyant_weight(self, fluid_density):
        return self.weight_air - self.volume * fluid_density * G_ACC

    def stretch(self, force_n):
        """Elastic elongation [m] of the whole string under an axial load."""
        return sum(force_n * t.length / (t.area * STEEL_E) for t in self.tapers)

    def wetted_perimeter_drag_coeff(self, tubing_id_m):
        """Sum of 2*pi*L / ln(Dt/Dr) over the tapers [m]."""
        total = 0.0
        for t in self.tapers:
            ratio = max(tubing_id_m / t.d, 1.05)
            total += 2.0 * math.pi * t.length / math.log(ratio)
        return total

    @property
    def natural_frequency(self):
        """Fundamental longitudinal frequency of the string [Hz]."""
        return SOUND_SPEED_ROD / (4.0 * max(self.length, 1.0))


class PumpingUnit:
    """Conventional beam unit, modelled as a crank-slider."""

    def __init__(self, stroke_length_m=2.54, pitman_length_m=3.65,
                 gearbox_rating_nm=64000.0, structural_rating_n=155000.0,
                 counterbalance_moment_nm=None):
        self.stroke = stroke_length_m
        self.pitman = pitman_length_m
        self.gearbox_rating = gearbox_rating_nm
        self.structural_rating = structural_rating_n
        self.counterbalance_moment = counterbalance_moment_nm

    @property
    def crank_radius(self):
        return self.stroke / 2.0

    @property
    def obliquity(self):
        """Crank/pitman ratio - the source of up/down stroke asymmetry."""
        return self.crank_radius / self.pitman

    def position(self, theta):
        """Polished-rod position above the bottom of the stroke [m]."""
        lam = self.obliquity
        return self.crank_radius * (
            (1.0 - math.cos(theta)) + 0.5 * lam * math.sin(theta) ** 2
        )

    def velocity(self, theta, omega):
        lam = self.obliquity
        return self.crank_radius * omega * (
            math.sin(theta) + 0.5 * lam * math.sin(2.0 * theta)
        )

    def acceleration(self, theta, omega):
        lam = self.obliquity
        return self.crank_radius * omega ** 2 * (
            math.cos(theta) + lam * math.cos(2.0 * theta)
        )

    def torque_factor(self, theta):
        """dx/dtheta [m/rad] - the exact torque factor by virtual work."""
        lam = self.obliquity
        return self.crank_radius * (
            math.sin(theta) + 0.5 * lam * math.sin(2.0 * theta)
        )


class Pump:
    """Downhole insert pump."""

    def __init__(self, plunger_diameter_in=1.75, plunger_length_in=48.0,
                 clearance_in=0.005, setting_depth_m=680.0):
        self.d = plunger_diameter_in * IN_TO_M
        self.d_in = plunger_diameter_in
        self.plunger_length_in = plunger_length_in
        self.clearance_in = clearance_in
        self.setting_depth = setting_depth_m

    @property
    def area(self):
        return math.pi * self.d ** 2 / 4.0

    def slippage_bpd(self, delta_p_kpa, mu_cp):
        """API/Patterson plunger slippage [bbl/d] (small for heavy oil)."""
        dp_psi = max(delta_p_kpa, 0.0) * 0.1450377
        return (2.77e6 * self.d_in * self.clearance_in ** 3 * dp_psi
                / max(mu_cp * self.plunger_length_in, 1e-6))


# ============================================================================
# valve timing
# ============================================================================
def _smoothstep(u):
    if u <= 0.0:
        return 0.0
    if u >= 1.0:
        return 1.0
    return 0.5 * (1.0 - math.cos(math.pi * u))


def _tv_indicator(theta, trans, fillage):
    """Fraction of the fluid load carried by the rods at crank angle theta.

    Upstroke  (0..pi)   the standing valve opens and the rods pick the load up.
    Downstroke(pi..2pi) the travelling valve can only open once the plunger has
                        descended through the unfilled part of the barrel. With
                        fillage < 1 the rods stay loaded for a fraction
                        (1 - fillage) of the downstroke and then let go
                        abruptly - the fluid-pound signature.
    """
    pi = math.pi
    if theta < pi:
        return _smoothstep(theta / max(trans, 1e-6))
    progress = (theta - pi) / pi                 # 0..1 down the stroke
    hold = 1.0 - fillage
    if progress < hold:
        return 1.0
    release = (progress - hold) / max(trans / pi, 1e-6)
    return 1.0 - _smoothstep(release)


# ============================================================================
# operating point
# ============================================================================
class SRPOperatingPoint:
    """Everything the twin needs to know about one pumping condition."""

    def __init__(self, unit, rods, pump, spm, tubing_id_in=2.441,
                 tubing_anchored=True, drag_factor=1.6,
                 downstroke_ratio=1.0, upstroke_ratio=1.0):
        self.unit = unit
        self.rods = rods
        self.pump = pump
        self.spm = max(spm, 0.05)
        self.tubing_id = tubing_id_in * IN_TO_M
        self.tubing_anchored = tubing_anchored
        self.drag_factor = drag_factor
        # VFD stroke shaping. A variable-speed drive can run the downstroke
        # slower than the upstroke; since rod drag scales with velocity this
        # buys back float margin, and speeding the upstroke recovers most of
        # the strokes per minute that would otherwise be lost.
        self.downstroke_ratio = max(min(downstroke_ratio, 1.0), 0.25)
        self.upstroke_ratio = max(min(upstroke_ratio, 2.0), 0.25)

    @property
    def omega(self):
        return 2.0 * math.pi * self.spm / 60.0

    @property
    def effective_spm(self):
        """Strokes/min actually achieved once the stroke is shaped."""
        if self.downstroke_ratio >= 0.999 and self.upstroke_ratio <= 1.001:
            return self.spm
        return 2.0 * self.spm / (1.0 / self.upstroke_ratio
                                 + 1.0 / self.downstroke_ratio)

    # ------------------------------------------------------------------
    def viscous_drag(self, mu_cp, velocity, q_prod_m3s=0.0):
        """Axial fluid force on the rod string [N], positive up.

        Uses the exact concentric-annulus solution per taper with the correct
        net-flow constraint, so rod Couette drag and tubing Poiseuille friction
        are solved together instead of being added twice. Also returns the
        friction pressure drop the plunger must overcome.
        """
        mu = max(mu_cp, 0.1) * 1e-3                      # Pa.s
        b = self.tubing_id / 2.0
        a_pl = self.pump.area
        total_force = 0.0
        friction_pa = 0.0
        for taper in self.rods.tapers:
            a = taper.d / 2.0
            if velocity >= 0:
                # upstroke: plunger lifts fluid, rod steel displaces some back
                q_req = a_pl * velocity - taper.area * velocity
            else:
                # downstroke: travelling valve open, only rod displacement
                q_req = -taper.area * velocity
            f, dpdz = annulus_rod_drag(a, b, mu, taper.length, velocity, q_req)
            total_force += f * self.drag_factor
            friction_pa += max(dpdz, 0.0) * taper.length
        return total_force, friction_pa

    def fluid_load(self, p_discharge_kpa, p_intake_kpa):
        """Load carried by the rods on the upstroke [N]."""
        dp = max(p_discharge_kpa - p_intake_kpa, 0.0) * 1000.0
        return self.pump.area * dp

    # ------------------------------------------------------------------
    def solve(self, mu_cp, fluid_density, p_discharge_kpa, p_intake_kpa,
              fillage=1.0, n_points=180):
        """Compute surface and downhole cards plus every derived KPI."""
        u, r, p = self.unit, self.rods, self.pump
        w_b = r.buoyant_weight(fluid_density)
        # viscous friction in the tubing adds to the pressure the plunger works
        # against; evaluated at mid-upstroke velocity
        v_ref = 0.64 * (u.stroke / 2.0) * (2.0 * math.pi * self.spm / 60.0)
        _, fric_pa = self.viscous_drag(mu_cp, v_ref)
        friction_kpa = fric_pa / 1000.0
        f_o = self.fluid_load(p_discharge_kpa + friction_kpa, p_intake_kpa)
        mass = r.mass
        omega = self.omega
        fillage = max(min(fillage, 1.0), 0.05)

        # rod stretch under the fluid load sets how much of the stroke is lost
        e_rod = r.stretch(f_o)
        e_tub = 0.0
        if not self.tubing_anchored:
            tub_area = math.pi * ((2.875 * IN_TO_M) ** 2
                                  - self.tubing_id ** 2) / 4.0
            e_tub = f_o * p.setting_depth / (tub_area * STEEL_E)
        overtravel = 0.5 * u.stroke * (p.setting_depth * omega
                                       / SOUND_SPEED_ROD) ** 2
        s_plunger = max(u.stroke - e_rod - e_tub + overtravel, 0.05)

        # valve-transition smoothing: the stress wave rounds the card corners
        trans = max(min((e_rod + e_tub) / u.stroke, 0.45), 0.02) * math.pi
        f_ratio = omega / (2.0 * math.pi * r.natural_frequency)

        surface, downhole = [], []
        drag_up_max = drag_dn_max = friction_pa_max = 0.0
        power_sum = 0.0
        torque_series = []

        for i in range(n_points + 1):
            theta = 2.0 * math.pi * i / n_points
            x = u.position(theta)
            v_raw = u.velocity(theta, omega)
            speed = (self.upstroke_ratio if v_raw >= 0
                     else self.downstroke_ratio)
            v = v_raw * speed
            a = u.acceleration(theta, omega) * speed * speed
            tf = u.torque_factor(theta)

            drag_f, fric_pa = self.viscous_drag(mu_cp, v)
            drag = abs(drag_f)
            if v >= 0:
                drag_up_max = max(drag_up_max, drag)
                friction_pa_max = max(friction_pa_max, fric_pa)
            else:
                drag_dn_max = max(drag_dn_max, drag)

            tv = _tv_indicator(theta, trans, fillage)

            inertia = mass * a
            ring = 0.0
            if f_ratio > 0.02:
                ring = 0.045 * f_o * f_ratio * math.sin(
                    4.0 * theta) * math.exp(-2.0 * abs(math.sin(theta / 2.0)))

            # drag_f is already signed (it opposes v)
            load = w_b + f_o * tv + inertia - drag_f + ring
            surface.append({"position_m": x, "load_n": load,
                            "theta": theta})

            # downhole (pump) card: strip rod weight, inertia and drag
            dh_pos = max(min(x * s_plunger / u.stroke, s_plunger), 0.0)
            dh_load = f_o * tv
            downhole.append({"position_m": dh_pos, "load_n": dh_load})

            torque_series.append(tf * load)
            power_sum += load * v

        n = len(surface)
        loads = [s["load_n"] for s in surface]
        pprl = max(loads)
        mprl = min(loads)

        # ---- counterbalance and gearbox torque ---------------------------
        cb_moment = (self.unit.counterbalance_moment
                     if self.unit.counterbalance_moment is not None
                     else 0.5 * (pprl + mprl) * u.crank_radius)
        net_torque = [
            torque_series[i] - cb_moment * math.sin(2.0 * math.pi * i / n_points)
            for i in range(n)
        ]
        peak_torque = max(abs(t) for t in net_torque)
        mean_torque = sum(abs(t) for t in net_torque) / n
        rms_torque = math.sqrt(sum(t * t for t in net_torque) / n)
        clf = rms_torque / max(mean_torque, 1e-6)

        # ---- power --------------------------------------------------------
        prhp_w = max(power_sum / n, 0.0)
        eta_surface, eta_motor = 0.88, 0.86
        motor_kw = prhp_w / (eta_surface * eta_motor) / 1000.0

        # ---- rod float ----------------------------------------------------
        # Net downward force available on the downstroke. The string can only
        # follow the polished rod down if gravity beats the upward viscous
        # drag plus travelling-valve resistance.
        tv_friction = 0.03 * f_o
        net_down = w_b - drag_dn_max - tv_friction
        float_index = net_down / max(w_b, 1.0)
        floating = float_index <= 0.0

        # depth at which the rod string first goes into compression: drag is
        # carried cumulatively from the bottom up, so the lower rods buckle first
        compression_depth = 0.0
        if floating:
            deficit = -net_down
            compression_depth = min(
                p.setting_depth * deficit / max(drag_dn_max, 1.0),
                p.setting_depth,
            )
        buckling_severity = max(-float_index, 0.0)

        # ---- impact loading ------------------------------------------------
        # An impact load in a rod string is a stress wave produced by a sudden
        # change of velocity. For a bar of acoustic impedance rho*c*A the load
        # step is  dF = rho * c * A * dv  -- the rod-string analogue of water
        # hammer. Both damage mechanisms in this field are velocity jumps:
        #   * fluid pound - the plunger free-falls through the unfilled barrel
        #     and strikes the liquid at the crank velocity of that instant;
        #   * rod float   - the string lags the polished rod, then snaps taut.
        impedance = STEEL_RHO * SOUND_SPEED_ROD * r.top_area   # N per (m/s)
        transit = 2.0 * p.setting_depth / SOUND_SPEED_ROD
        period = 60.0 / self.effective_spm
        v_peak = max(abs(u.velocity(th, omega))
                     for th in (0.4 * math.pi, 0.5 * math.pi, 1.5 * math.pi))

        f_pound = 0.0
        if fillage < 0.98:
            contact_theta = math.pi * (1.0 + (1.0 - fillage))
            v_contact = abs(u.velocity(min(contact_theta, 1.999 * math.pi),
                                       omega))
            f_pound = impedance * v_contact * math.sqrt(1.0 - fillage)

        f_slack = 0.0
        if float_index < 0.0:
            deficit = -net_down                              # N
            accel = deficit / max(mass, 1.0)                 # m/s2
            t_lag = 0.25 * period
            dv = min(accel * t_lag, v_peak)
            f_slack = impedance * dv

        impact_load = f_pound + f_slack
        impact_index = impact_load / max(f_o, 0.1 * w_b)

        dt_step = period / n_points
        dfdt = [abs(loads[(i + 1) % n] - loads[i]) / dt_step for i in range(n)]
        impact_rate = max(dfdt) + impact_load / max(transit, 1e-3)

        # ---- displacement -------------------------------------------------
        q_theor_m3d = p.area * s_plunger * self.effective_spm * 1440.0
        slip = p.slippage_bpd(p_discharge_kpa - p_intake_kpa, mu_cp) / 6.2898
        q_actual_m3d = max(q_theor_m3d * fillage - slip, 0.0)
        vol_eff = q_actual_m3d / max(q_theor_m3d, 1e-9)

        # ---- rod stress / modified Goodman --------------------------------
        area_top = r.top_area
        s_max = (pprl + impact_load) / area_top * PSI_PER_PA
        s_min = mprl / area_top * PSI_PER_PA
        tensile = API_GRADE_TENSILE.get(r.grade, 115000.0)
        s_allow = (tensile / 4.0 + 0.5625 * max(s_min, 0.0)) * r.service_factor
        goodman = s_max / max(s_allow, 1.0)

        return {
            "surface_card": surface,
            "downhole_card": downhole,
            "spm": self.spm,
            "effective_spm": self.effective_spm,
            "downstroke_ratio": self.downstroke_ratio,
            "upstroke_ratio": self.upstroke_ratio,
            "stroke_m": u.stroke,
            "plunger_stroke_m": s_plunger,
            "rod_stretch_m": e_rod,
            "tubing_stretch_m": e_tub,
            "overtravel_m": overtravel,
            "buoyant_rod_weight_n": w_b,
            "fluid_load_n": f_o,
            "pprl_n": pprl,
            "mprl_n": mprl,
            "pprl_lbf": pprl * LBF_PER_N,
            "mprl_lbf": mprl * LBF_PER_N,
            "drag_up_max_n": drag_up_max,
            "drag_down_max_n": drag_dn_max,
            "rod_float_index": float_index,
            "rod_floating": floating,
            "compression_depth_m": compression_depth,
            "buckling_severity": buckling_severity,
            "impact_index": impact_index,
            "impact_load_n": impact_load,
            "impact_load_rate_n_s": impact_rate,
            "peak_gearbox_torque_nm": peak_torque,
            "gearbox_load_pct": 100.0 * peak_torque / u.gearbox_rating,
            "structural_load_pct": 100.0 * pprl / u.structural_rating,
            "counterbalance_moment_nm": cb_moment,
            "cyclic_load_factor": clf,
            "polished_rod_power_kw": prhp_w / 1000.0,
            "motor_power_kw": motor_kw,
            "q_theoretical_m3d": q_theor_m3d,
            "q_actual_m3d": q_actual_m3d,
            "slippage_m3d": slip,
            "fillage": fillage,
            "volumetric_efficiency": vol_eff,
            "stress_max_psi": s_max,
            "stress_min_psi": s_min,
            "goodman_allowable_psi": s_allow,
            "goodman_ratio": goodman,
            "mu_cp": mu_cp,
            "tubing_friction_kpa": friction_kpa,
        }


# ============================================================================
# helpers used by the twin and the controller
# ============================================================================
def pump_capacity_m3d(unit, pump, spm, plunger_stroke_m=None):
    """Theoretical displacement [m3/d] used for the nodal pump-capacity line."""
    s = plunger_stroke_m if plunger_stroke_m else unit.stroke
    return pump.area * s * spm * 1440.0


def card_features(result, n_harmonics=6):
    """Compact, scale-free descriptors of the downhole card for the classifier.

    Returns normalised area, aspect, corner sharpness and the first few
    Fourier descriptors of the closed card outline - enough to separate
    normal / fluid pound / gas interference / rod float / worn pump / leak.
    """
    card = result["downhole_card"]
    xs = [c["position_m"] for c in card]
    ys = [c["load_n"] for c in card]
    x_rng = max(max(xs) - min(xs), 1e-6)
    y_rng = max(max(ys) - min(ys), 1e-6)
    xn = [(x - min(xs)) / x_rng for x in xs]
    yn = [(y - min(ys)) / y_rng for y in ys]

    # shoelace area of the closed card (normalised 0..1)
    area = 0.0
    for i in range(len(xn)):
        j = (i + 1) % len(xn)
        area += xn[i] * yn[j] - xn[j] * yn[i]
    area = abs(area) / 2.0

    # Fourier descriptors of the complex outline
    n = len(xn)
    desc = []
    for k in range(1, n_harmonics + 1):
        re = im = 0.0
        for i in range(n):
            ang = -2.0 * math.pi * k * i / n
            re += xn[i] * math.cos(ang) - yn[i] * math.sin(ang)
            im += xn[i] * math.sin(ang) + yn[i] * math.cos(ang)
        desc.append(math.hypot(re, im) / n)

    # where along the downstroke the load collapses (fluid-pound signature)
    half = n // 2
    down = yn[half:]
    drop_at = 0.0
    for i, v in enumerate(down):
        if v < 0.5:
            drop_at = i / max(len(down) - 1, 1)
            break

    return {
        "card_area": area,
        "aspect": y_rng / max(x_rng, 1e-6) * 1e-5,
        "load_drop_position": drop_at,
        "fourier": desc,
        "float_index": result["rod_float_index"],
        "impact_index": result["impact_index"],
        "fillage": result["fillage"],
        "goodman_ratio": result["goodman_ratio"],
    }

# BaghewalaOS API adapter: maps the WagheraOS mechanical solver into the
# project's existing typed twin contract. No randomness or mock data.
from dataclasses import dataclass
from typing import Dict, List
from .fluids import ViscosityModel, BBL_PER_M3
from .wellbore import WellborePressure, WellboreThermal, effective_drag_viscosity, mixture_density

@dataclass
class SrpState:
    motor_power_kw: float
    polished_rod_max_kn: float
    polished_rod_min_kn: float
    rod_weight_kn: float
    rod_stress_max_mpa: float
    fatigue_index: float
    pump_condition: float
    rod_float_probability: float
    impact_shock: float
    surface_card: List[Dict[str, float]]
    downhole_card: List[Dict[str, float]]
    goodman: float
    pump_seating: str
    spm: float
    effective_spm: float
    fillage: float
    volumetric_efficiency: float
    pprl_lbf: float
    mprl_lbf: float
    rod_float_index: float
    rod_floating: bool
    compression_depth_m: float
    impact_index: float
    impact_load_n: float
    goodman_ratio: float
    gearbox_load_pct: float
    structural_load_pct: float
    tubing_friction_kpa: float
    provenance: str = "SYNTHETIC"
    physics_source: str = "WagheraOS SRP exact annular-drag solver"


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


def _assumed_water_cut(meta) -> float:
    # No verified field water-cut feed exists in this workspace.
    return _clamp(0.12 * (1.0 + 0.35 * (meta.fingerprint.asphaltene_tendency - 0.3)), 0.05, 0.25)


def simulate_srp(meta, css, stroke_m, spm, vfd_pct, fault) -> SrpState:
    water_cut = _assumed_water_cut(meta)
    visc = ViscosityModel(api=meta.fingerprint.api_gravity,
                          anchor_lo=(47.0, 1500.0), anchor_hi=(200.0, 12.0))
    rho_oil = visc.density(css.reservoir_temperature_c)
    rho_mix = mixture_density(water_cut, rho_oil, css.reservoir_temperature_c)

    pump_depth_m = 680.0
    wb_pressure = WellborePressure(
        pump_depth_m=pump_depth_m,
        casing_head_kpa=250.0,
        tubing_head_kpa=450.0,
        perforation_depth_m=min(meta.depth_m, 700.0),
    )
    wb_thermal = WellboreThermal(
        pump_depth_m=pump_depth_m,
        surface_temp_c=32.0,
        geothermal_grad_c_per_m=(css.reservoir_temperature_c - 32.0) / pump_depth_m,
    )

    unit = PumpingUnit(stroke_length_m=stroke_m, pitman_length_m=3.65,
                       gearbox_rating_nm=64000.0, structural_rating_n=155000.0)
    rods = RodString([RodTaper(0.875, 300.0), RodTaper(0.75, 380.0)], grade="D")
    pump = Pump(plunger_diameter_in=1.75, setting_depth_m=pump_depth_m)

    mass_rate = max(css.oil_rate_bopd, 0.0) / BBL_PER_M3 / 86400.0 * rho_mix
    mu_drag = effective_drag_viscosity(
        rods, wb_thermal, visc, css.reservoir_temperature_c, mass_rate,
        tubing_id_m=0.062, n_slices=24,
    )

    p_wf_kpa = max(css.pressure_bar * 100.0, 650.0)
    head_m = max((p_wf_kpa - wb_pressure.p_casing) * 1000.0 /
                 max(rho_mix * G_ACC, 1e-9), 0.0)
    fluid_level_m = _clamp(pump_depth_m - head_m, 0.0, pump_depth_m)
    p_intake_kpa = wb_pressure.intake_pressure(fluid_level_m, rho_mix)
    p_discharge_kpa = wb_pressure.discharge_pressure(rho_mix)

    # VFD percentage is used only to shape downstroke speed. This convention
    # is explicit and remains a demo assumption until field controls are wired.
    ds = _clamp(0.65 + 0.35 * (float(vfd_pct) / 100.0), 0.30, 1.0)
    us = min(1.35, 1.0 / max(2.0 - 1.0 / ds, 0.55)) if ds < 0.999 else 1.0

    point = SRPOperatingPoint(
        unit, rods, pump, max(float(spm), 0.2),
        tubing_id_in=2.441, tubing_anchored=True,
        downstroke_ratio=ds, upstroke_ratio=us,
    )
    q_theor = pump_capacity_m3d(unit, pump, max(float(spm), 0.2), pump.plunger_length_in * 0.0254)
    fillage = _clamp((css.oil_rate_bopd / BBL_PER_M3) / max(q_theor, 1e-9), 0.20, 1.0)
    if fault in {"rod_float", "fluid_pound"}:
        fillage = min(fillage, 0.72)

    card = point.solve(
        mu_drag, rho_mix, p_discharge_kpa, p_intake_kpa,
        fillage=fillage, n_points=96,
    )

    pprl_kn = card["pprl_n"] / 1000.0
    mprl_kn = card["mprl_n"] / 1000.0
    stress_mpa = card["stress_max_psi"] * 0.00689475729
    float_prob = _clamp(0.015 + 0.985 * max(card["rod_float_index"], 0.0), 0.0, 1.0)
    if card["rod_floating"]:
        float_prob = max(float_prob, 0.80)

    if card["rod_floating"] or card["mprl_n"] < 0:
        seating = "unseated"
    elif card["buckling_severity"] > 0.35:
        seating = "light_tap"
    else:
        seating = "seated"
    if fault == "pump_unseating":
        seating = "unseated"

    return SrpState(
        motor_power_kw=round(card["motor_power_kw"], 3),
        polished_rod_max_kn=round(pprl_kn, 3),
        polished_rod_min_kn=round(mprl_kn, 3),
        rod_weight_kn=round(card["buoyant_rod_weight_n"] / 1000.0, 3),
        rod_stress_max_mpa=round(stress_mpa, 3),
        fatigue_index=round(_clamp(card["goodman_ratio"], 0.0, 1.5), 4),
        pump_condition=round(card["volumetric_efficiency"], 4),
        rod_float_probability=round(float_prob, 4),
        impact_shock=round(_clamp(card["impact_index"], 0.0, 1.0), 4),
        surface_card=card["surface_card"],
        downhole_card=card["downhole_card"],
        goodman=round(card["goodman_ratio"], 4),
        pump_seating=seating,
        spm=round(card["spm"], 3),
        effective_spm=round(card["effective_spm"], 3),
        fillage=round(card["fillage"], 4),
        volumetric_efficiency=round(card["volumetric_efficiency"], 4),
        pprl_lbf=round(card["pprl_lbf"], 2),
        mprl_lbf=round(card["mprl_lbf"], 2),
        rod_float_index=round(card["rod_float_index"], 4),
        rod_floating=bool(card["rod_floating"]),
        compression_depth_m=round(card["compression_depth_m"], 3),
        impact_index=round(card["impact_index"], 4),
        impact_load_n=round(card["impact_load_n"], 2),
        goodman_ratio=round(card["goodman_ratio"], 4),
        gearbox_load_pct=round(card["gearbox_load_pct"], 3),
        structural_load_pct=round(card["structural_load_pct"], 3),
        tubing_friction_kpa=round(card["tubing_friction_kpa"], 3),
    )
