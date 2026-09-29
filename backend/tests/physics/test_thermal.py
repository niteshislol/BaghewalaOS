import pytest
import math
from app.physics.thermal import (
    ml_heat_efficiency,
    marx_langenheim_area,
    ramey_wellbore_loss,
    HeatedZone,
    OverburdenProps
)


def test_ml_heat_efficiency():
    # The function returns G(tD). The actual thermal efficiency is G(tD) / tD.
    g_1 = ml_heat_efficiency(1.0)
    g_01 = ml_heat_efficiency(0.1)
    # G(tD) increases with time
    assert g_1 > g_01
    # But the efficiency G(tD)/tD decreases over time
    assert (g_1 / 1.0) < (g_01 / 0.1)


def test_marx_langenheim_area():
    ob = OverburdenProps()
    # No heat injected -> no area
    assert marx_langenheim_area(0, 3600, 10, 100, 2.35e6, ob) == 0.0
    
    # Area grows over time
    area_1hr = marx_langenheim_area(1e6, 3600, 10, 100, 2.35e6, ob)
    area_2hr = marx_langenheim_area(1e6, 7200, 10, 100, 2.35e6, ob)
    assert area_2hr > area_1hr > 0.0


def test_ramey_wellbore_loss():
    # No loss if steam temp <= ambient
    assert ramey_wellbore_loss(10e6, 1000, 30.0, 30.0) == 0.0
    
    # Loss increases with depth
    loss_1000m = ramey_wellbore_loss(10e6, 1000, 300.0, 30.0)
    loss_2000m = ramey_wellbore_loss(10e6, 2000, 300.0, 30.0)
    assert loss_2000m > loss_1000m
    
    # Loss bounded to 0.6 (60%)
    extreme_loss = ramey_wellbore_loss(1e3, 5000, 300.0, 10.0, u_overall=50.0)
    assert extreme_loss == 0.6


def test_heated_zone_injection():
    hz = HeatedZone(t_res=50.0, pay_thickness=10.0, temperature=50.0)
    assert hz.temperature == 50.0
    assert hz.area == 0.0
    
    # Inject steam
    dt = 86400  # 1 day
    hz.inject(q_inj_w=5e6, dt=dt, t_steam=300.0, cumulative_inj_time=0.0)
    
    assert hz.area > 0.0
    assert hz.temperature > 50.0
    
    # Temperature should not exceed steam temperature
    hz.inject(q_inj_w=5e6, dt=dt*100, t_steam=300.0, cumulative_inj_time=dt)
    assert hz.temperature <= 300.0


def test_heated_zone_cooling_monotonicity():
    hz = HeatedZone(t_res=50.0, pay_thickness=10.0, temperature=50.0)
    hz.inject(q_inj_w=5e6, dt=86400*10, t_steam=300.0, cumulative_inj_time=0.0)
    
    initial_temp = hz.temperature
    assert initial_temp > 50.0
    
    # Step forward (soak, no production)
    hz.step(dt=86400)
    temp_after_soak = hz.temperature
    assert temp_after_soak < initial_temp
    
    # Step forward (production, extra heat loss)
    hz.step(dt=86400, q_oil_m3s=0.01, q_water_m3s=0.01)
    temp_after_prod = hz.temperature
    assert temp_after_prod < temp_after_soak
    
    # Temperature should not drop below ambient
    hz.step(dt=86400 * 3650) # 10 years
    assert hz.temperature >= 50.0

