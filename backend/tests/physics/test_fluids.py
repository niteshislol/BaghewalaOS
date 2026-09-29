import pytest
import math
from app.physics.fluids import (
    c_to_f,
    f_to_c,
    api_to_sg,
    sg_to_api,
    ViscosityModel,
    dead_oil_viscosity_br,
    water_viscosity,
    water_density,
    steam_sat_temp,
    steam_sat_pressure,
    water_enthalpy,
    latent_heat,
    steam_enthalpy
)


def test_temperature_conversion():
    assert math.isclose(c_to_f(0), 32.0)
    assert math.isclose(c_to_f(100), 212.0)
    assert math.isclose(f_to_c(32), 0.0)
    assert math.isclose(f_to_c(212), 100.0)


def test_api_sg_conversion():
    # Water is 10 API
    assert math.isclose(api_to_sg(10), 1.0)
    assert math.isclose(sg_to_api(1.0), 10.0)


def test_viscosity_model_beggs_robinson_fallback():
    # Model without anchors should fall back to Beggs-Robinson
    model = ViscosityModel(api=18.0, anchor_lo=None, anchor_hi=None)
    # Check that viscosity decreases as temperature increases
    mu_40 = model.mu_oil(40.0)
    mu_80 = model.mu_oil(80.0)
    assert mu_80 < mu_40
    assert mu_40 > 0


def test_viscosity_model_walther_fit():
    # Model with anchors should fit Walther equation
    model = ViscosityModel(api=15.0, anchor_lo=(40.0, 2000.0), anchor_hi=(200.0, 10.0))
    
    # Check anchor points (should be close to the provided anchors)
    assert math.isclose(model.mu_oil(40.0), 2000.0, rel_tol=0.05)
    assert math.isclose(model.mu_oil(200.0), 10.0, rel_tol=0.05)

    # Check monotonicity
    mu_100 = model.mu_oil(100.0)
    assert 10.0 < mu_100 < 2000.0


def test_water_properties():
    # Water viscosity decreases with temperature
    assert water_viscosity(100.0) < water_viscosity(20.0)
    assert water_viscosity(20.0) > 0.0

    # Water density is around 1000 at 0-20C and decreases
    rho_20 = water_density(20.0)
    rho_100 = water_density(100.0)
    assert 990.0 < rho_20 < 1005.0
    assert rho_100 < rho_20


def test_steam_saturation_properties():
    # 100C is roughly 101.325 kPa (1 atm)
    p_100 = steam_sat_pressure(100.0)
    assert math.isclose(p_100, 101.325, rel_tol=0.1)

    # Inverse relationship check
    t_sat = steam_sat_temp(p_100)
    assert math.isclose(t_sat, 100.0, rel_tol=0.05)


def test_enthalpy_and_latent_heat():
    # Latent heat at 100C is ~2257 kJ/kg
    lh_100 = latent_heat(100.0)
    assert math.isclose(lh_100, 2257.0, rel_tol=0.01)

    # Enthalpy of saturated liquid water at 100C is ~419 kJ/kg
    hw_100 = water_enthalpy(100.0)
    assert math.isclose(hw_100, 419.0, rel_tol=0.01)

    # Enthalpy of wet steam (quality 0.5)
    hs_100_q50 = steam_enthalpy(100.0, 0.5)
    assert math.isclose(hs_100_q50, hw_100 + 0.5 * lh_100, rel_tol=0.01)
