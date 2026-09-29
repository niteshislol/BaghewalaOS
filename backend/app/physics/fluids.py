"""
Fluid, steam and rock property correlations for the Baghewala heavy-oil system.

All functions are SI-in / SI-out unless the docstring says otherwise.
Temperatures are degrees Celsius, pressures kPa (absolute), viscosity cP,
densities kg/m3, enthalpies kJ/kg.

References
----------
Beggs & Robinson (1975)      - dead / live oil viscosity
ASTM D341 (Walther)          - viscosity-temperature for heavy crudes
Farouq Ali / Prats           - steam saturation properties
Watson (1943)                - latent heat scaling
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Tuple

# ----------------------------------------------------------------------------
# physical constants
# ----------------------------------------------------------------------------
G_ACC = 9.80665          # m/s2
STEEL_RHO = 7850.0       # kg/m3
STEEL_E = 2.07e11        # Pa  (Young's modulus, steel sucker rods)
WATER_CP = 4186.0        # J/kg-K
OIL_CP = 1900.0          # J/kg-K   (heavy crude, mean 40-250 C)
KPA_PER_PSI = 6.894757
M_PER_FT = 0.3048
BBL_PER_M3 = 6.289811


# ----------------------------------------------------------------------------
# unit helpers
# ----------------------------------------------------------------------------
def c_to_f(t_c):
    return t_c * 9.0 / 5.0 + 32.0


def f_to_c(t_f):
    return (t_f - 32.0) * 5.0 / 9.0


def api_to_sg(api):
    return 141.5 / (131.5 + api)


def sg_to_api(sg):
    return 141.5 / sg - 131.5


# ----------------------------------------------------------------------------
# oil viscosity
# ----------------------------------------------------------------------------
def dead_oil_viscosity_br(api, t_c):
    """Beggs-Robinson dead-oil viscosity [cP].

    Reliable for medium crudes; it under-predicts strongly asphaltenic heavy
    oils such as Baghewala, which is why ViscosityModel prefers a Walther fit
    anchored on measured points when they are supplied.
    """
    t_f = max(c_to_f(t_c), 40.0)
    z = 3.0324 - 0.02023 * api
    y = 10.0 ** z
    x = y * t_f ** (-1.163)
    return max(10.0 ** x - 1.0, 0.15)


def live_oil_viscosity_br(mu_dead, rs):
    """Beggs-Robinson saturated (live) oil viscosity [cP]. rs in scf/stb."""
    a = 10.715 * (rs + 100.0) ** -0.515
    b = 5.44 * (rs + 150.0) ** -0.338
    return max(a * mu_dead ** b, 0.1)


@dataclass
class ViscosityModel:
    """Temperature-viscosity model for the crude.

    Two calibration anchors (temperature, dynamic viscosity) define an ASTM
    D341 / Walther straight line on log-log(nu)-vs-log(T) axes:

        log10(log10(nu + 0.7)) = A - B * log10(T_K)

    This is the standard heavy-oil form and reproduces the several-orders-of-
    magnitude drop between reservoir and steam temperature that makes CSS work.
    Setting either anchor to None falls back to Beggs-Robinson.
    """

    api: float = 18.0
    rs: float = 25.0
    anchor_lo: Optional[Tuple[float, float]] = (47.0, 1500.0)   # (degC, cP)
    anchor_hi: Optional[Tuple[float, float]] = (200.0, 12.0)

    def __post_init__(self):
        self._a = None
        self._b = None
        if self.anchor_lo and self.anchor_hi:
            self._fit_walther()

    def density(self, t_c):
        """Oil density [kg/m3] at temperature, thermal expansion included."""
        rho15 = api_to_sg(self.api) * 999.0
        beta = 5.5e-4  # 1/degC, typical heavy crude
        return rho15 / (1.0 + beta * (t_c - 15.6))

    def _fit_walther(self):
        (t1, mu1), (t2, mu2) = self.anchor_lo, self.anchor_hi
        pts = []
        for t_c, mu in ((t1, mu1), (t2, mu2)):
            nu = mu / (self.density(t_c) / 1000.0)  # cP -> cSt
            z = nu + 0.7
            pts.append((math.log10(t_c + 273.15), math.log10(math.log10(z))))
        (x1, y1), (x2, y2) = pts
        self._b = (y1 - y2) / (x2 - x1)
        self._a = y1 + self._b * x1

    def mu_oil(self, t_c):
        """Oil viscosity [cP] at temperature."""
        if self._a is None:
            return live_oil_viscosity_br(
                dead_oil_viscosity_br(self.api, t_c), self.rs
            )
        t_k = max(t_c, -20.0) + 273.15
        loglog = self._a - self._b * math.log10(t_k)
        loglog = min(loglog, 1.2)          # guard overflow at very low T
        z = 10.0 ** (10.0 ** loglog)
        nu = max(z - 0.7, 1e-3)            # cSt
        return max(nu * (self.density(t_c) / 1000.0), 0.15)


def water_viscosity(t_c):
    """Vogel/Fulcher fit for liquid water viscosity [cP]."""
    t_k = max(t_c, 1.0) + 273.15
    return 2.414e-2 * 10.0 ** (247.8 / max(t_k - 140.0, 20.0))


def water_density(t_c):
    """Saturated liquid water density [kg/m3]."""
    t = max(min(t_c, 350.0), 0.0)
    return 1000.6 - 0.0574 * t - 0.0031 * t * t + 8.0e-6 * t ** 3


# ----------------------------------------------------------------------------
# steam properties
# ----------------------------------------------------------------------------
def steam_sat_temp(p_kpa):
    """Saturation temperature [degC] from absolute pressure [kPa]."""
    p_psia = max(p_kpa, 15.0) * 0.1450377
    return f_to_c(115.1 * p_psia ** 0.225)


def steam_sat_pressure(t_c):
    """Saturation pressure [kPa abs] from temperature [degC]."""
    t_f = c_to_f(max(min(t_c, 370.0), 5.0))
    p_psia = (t_f / 115.1) ** (1.0 / 0.225)
    return p_psia / 0.1450377


def water_enthalpy(t_c):
    """Saturated-liquid enthalpy [kJ/kg] above 0 degC."""
    t = max(min(t_c, 370.0), 0.0)
    return 4.0448 * t + 0.0014617 * t * t


def latent_heat(t_c):
    """Latent heat of vaporisation [kJ/kg] via the Watson relation."""
    t_crit = 374.15
    t = max(min(t_c, 370.0), 5.0)
    return 2257.0 * ((t_crit - t) / (t_crit - 100.0)) ** 0.38


def steam_enthalpy(t_c, quality):
    """Enthalpy [kJ/kg] of wet steam at saturation temperature."""
    return water_enthalpy(t_c) + max(min(quality, 1.0), 0.0) * latent_heat(t_c)


def injected_heat_rate(mdot_kg_s, t_steam, quality, t_res):
    """Net heat injection rate [W] referenced to reservoir temperature."""
    dh = steam_enthalpy(t_steam, quality) - water_enthalpy(t_res)  # kJ/kg
    return mdot_kg_s * dh * 1000.0


# ----------------------------------------------------------------------------
# formation volume factor / solution gas (low-GOR heavy oil)
# ----------------------------------------------------------------------------
def bo_standing(api, rs, t_c, p_kpa):
    """Standing oil formation volume factor [rm3/sm3]."""
    sg_o = api_to_sg(api)
    sg_g = 0.75
    t_f = c_to_f(t_c)
    f = rs * math.sqrt(sg_g / sg_o) + 1.25 * t_f
    return 0.9759 + 12e-5 * f ** 1.2


def thermal_expansion_bo(bo_ref, t_c, t_ref):
    """Correct Bo for temperature above the reference (thermal EOR)."""
    return bo_ref * (1.0 + 5.5e-4 * (t_c - t_ref))
