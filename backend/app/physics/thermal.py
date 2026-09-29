"""
Thermal reservoir models for Cyclic Steam Stimulation.

Contains
--------
marx_langenheim_area   - steam-zone growth during injection
HeatedZone             - lumped Boberg-Lantz-type energy balance carried
                         through soak and production (the "reservoir heating,
                         cooling and production performance" the twin predicts)
ramey_wellbore_loss    - heat lost down the injection string
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from .fluids import OIL_CP, WATER_CP, water_density


# ----------------------------------------------------------------------------
# numerically stable exp(x) * erfc(sqrt(x))
# ----------------------------------------------------------------------------
def _exp_erfc(x):
    """exp(x)*erfc(sqrt(x)) without overflow for large x."""
    if x < 25.0:
        return math.exp(x) * math.erfc(math.sqrt(x))
    # asymptotic expansion of erfc for large argument
    inv = 1.0 / x
    return (1.0 / math.sqrt(math.pi * x)) * (
        1.0 - 0.5 * inv + 0.75 * inv * inv - 1.875 * inv ** 3
    )


def ml_heat_efficiency(t_d):
    """Marx-Langenheim thermal-efficiency function G(tD).

    G = exp(tD)*erfc(sqrt(tD)) + 2*sqrt(tD/pi) - 1

    G/tD is the fraction of injected heat still resident in the steam zone.
    """
    if t_d <= 0.0:
        return 0.0
    return _exp_erfc(t_d) + 2.0 * math.sqrt(t_d / math.pi) - 1.0


@dataclass
class OverburdenProps:
    """Thermal properties of the cap / base rock (conduction sink)."""

    conductivity: float = 1.7        # W/m-K
    heat_capacity: float = 2.10e6    # J/m3-K

    @property
    def diffusivity(self):           # m2/s
        return self.conductivity / self.heat_capacity


def marx_langenheim_area(q_inj_w, t_seconds, pay_thickness, delta_t,
                         m_reservoir, ob):
    """Heated (steam-zone) area [m2] after t_seconds of injection.

    Marx and Langenheim (1959):

        A(t) = Qi * h * Mr * alpha_ob / (4 * k_ob^2 * dT) * G(tD)
        tD   = 4 * k_ob^2 * t / (Mr^2 * h^2 * alpha_ob)

    Parameters
    ----------
    q_inj_w        net heat injection rate at the sandface [W]
    t_seconds      elapsed injection time [s]
    pay_thickness  net heated pay [m]
    delta_t        steam temperature minus reservoir temperature [K]
    m_reservoir    volumetric heat capacity of the reservoir [J/m3-K]
    ob             OverburdenProps for the cap and base rock
    """
    if q_inj_w <= 0.0 or t_seconds <= 0.0 or delta_t <= 0.0:
        return 0.0
    k_ob = ob.conductivity
    alpha = ob.diffusivity
    t_d = 4.0 * k_ob ** 2 * t_seconds / (
        m_reservoir ** 2 * pay_thickness ** 2 * alpha
    )
    pre = q_inj_w * pay_thickness * m_reservoir * alpha / (
        4.0 * k_ob ** 2 * delta_t
    )
    return pre * ml_heat_efficiency(t_d)


def ramey_wellbore_loss(q_inj_w, depth_m, t_steam, t_ambient_mean,
                        u_overall=12.0, casing_od=0.1778):
    """Fraction of injected heat lost between wellhead and sandface.

    Ramey (1962) steady-state approximation with an overall heat-transfer
    coefficient u_overall [W/m2-K] referred to the casing OD. Insulated
    tubing gives U ~ 2-6, bare tubing in an air-filled annulus U ~ 10-20.
    """
    if q_inj_w <= 0.0:
        return 0.0
    area = math.pi * casing_od * depth_m
    q_loss = u_overall * area * max(t_steam - t_ambient_mean, 0.0)
    return min(q_loss / q_inj_w, 0.6)


# ----------------------------------------------------------------------------
# heated-zone energy balance (soak + production)
# ----------------------------------------------------------------------------
@dataclass
class HeatedZone:
    """Lumped thermal state of the near-well heated region.

    During soak and production the zone loses energy by

      1. vertical conduction into cap and base rock (semi-infinite slab),
      2. radial conduction into the cold reservoir at the flank,
      3. enthalpy carried away with produced oil and water.

    Integrating that balance is the Boberg-Lantz picture solved numerically,
    which lets produced-fluid cooling feed back on the temperature (and hence
    on viscosity, IPR and rod drag) every timestep.
    """

    t_res: float = 47.0               # ambient reservoir temperature [degC]
    pay_thickness: float = 6.0        # m
    m_reservoir: float = 2.35e6       # J/m3-K
    k_reservoir: float = 1.5          # W/m-K
    ob: OverburdenProps = field(default_factory=OverburdenProps)

    # state
    area: float = 0.0                 # heated area [m2]
    temperature: float = 47.0         # volumetric mean temperature [degC]
    age_since_injection: float = 0.0  # s, drives the conduction transient

    # -- geometry ------------------------------------------------------------
    @property
    def radius(self):
        return math.sqrt(self.area / math.pi) if self.area > 0 else 0.0

    @property
    def volume(self):
        return self.area * self.pay_thickness

    @property
    def stored_energy(self):
        """Energy above ambient held in the heated rock and fluid [J]."""
        return self.volume * self.m_reservoir * (self.temperature - self.t_res)

    # -- injection -----------------------------------------------------------
    def inject(self, q_inj_w, dt, t_steam, cumulative_inj_time):
        """Add injected heat to the zone and grow it with Marx-Langenheim.

        The energy balance is done on the heat itself, not on the swept area.
        That distinction matters from the second cycle onward: a later slug is
        injected into a zone that has already been swept once, so there is
        little NEW area to create - but the heat still goes in and re-heats the
        rock that is already there. Crediting only the new area would leave a
        re-steamed well cold, which is not what happens in the field.

        The zone cannot end up hotter than the steam feeding it; any surplus
        has gone into the cap and base rock, which is exactly the loss
        Marx-Langenheim already books when it sizes the swept area.
        """
        delta_t = t_steam - self.t_res
        if delta_t <= 0 or q_inj_w <= 0:
            return
        energy = self.stored_energy + q_inj_w * dt
        ml_area = marx_langenheim_area(
            q_inj_w, cumulative_inj_time + dt, self.pay_thickness,
            delta_t, self.m_reservoir, self.ob,
        )
        self.area = max(ml_area, self.area)
        capacity = self.volume * self.m_reservoir
        if capacity > 0:
            self.temperature = min(self.t_res + energy / capacity, t_steam)
        self.age_since_injection = 0.0

    # -- cooling -------------------------------------------------------------
    def _conduction_loss(self, dt):
        """Vertical plus radial conduction loss rate [W]."""
        if self.area <= 0:
            return 0.0
        dtemp = self.temperature - self.t_res
        if dtemp <= 0.01:
            return 0.0
        # transient time floor keeps the semi-infinite solution finite at t=0
        t_eff = max(self.age_since_injection, 0.5 * dt, 3600.0)

        # (1) cap and base rock, two faces
        alpha_ob = self.ob.diffusivity
        q_vert = (2.0 * self.area * self.ob.conductivity * dtemp
                  / math.sqrt(math.pi * alpha_ob * t_eff))

        # (2) cylindrical flank into the cold reservoir
        alpha_r = self.k_reservoir / self.m_reservoir
        side_area = 2.0 * math.pi * self.radius * self.pay_thickness
        q_rad = (side_area * self.k_reservoir * dtemp
                 / math.sqrt(math.pi * alpha_r * t_eff))
        return q_vert + q_rad

    def _produced_fluid_loss(self, q_oil_m3s, q_water_m3s, rho_oil):
        """Enthalpy leaving with produced fluids [W]."""
        dtemp = self.temperature - self.t_res
        if dtemp <= 0:
            return 0.0
        c_oil = q_oil_m3s * rho_oil * OIL_CP
        c_wat = q_water_m3s * water_density(self.temperature) * WATER_CP
        return (c_oil + c_wat) * dtemp

    def step(self, dt, q_oil_m3s=0.0, q_water_m3s=0.0, rho_oil=930.0):
        """Advance the thermal state by dt seconds with no injection."""
        if self.area <= 0:
            return {"q_conduction": 0.0, "q_produced": 0.0}
        self.age_since_injection += dt
        q_cond = self._conduction_loss(dt)
        q_prod = self._produced_fluid_loss(q_oil_m3s, q_water_m3s, rho_oil)
        capacity = self.volume * self.m_reservoir          # J/K
        d_temp = -(q_cond + q_prod) * dt / capacity
        # never fall below ambient
        self.temperature = max(self.temperature + d_temp, self.t_res)
        return {"q_conduction": q_cond, "q_produced": q_prod}

    def snapshot(self):
        return {
            "heated_radius_m": round(self.radius, 2),
            "heated_area_m2": round(self.area, 1),
            "heated_volume_m3": round(self.volume, 1),
            "zone_temperature_c": round(self.temperature, 2),
            "stored_energy_gj": round(self.stored_energy / 1e9, 2),
        }
