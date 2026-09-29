from app.physics.css import simulate_css
from app.physics.srp import simulate_srp
from app.physics.wellbore import simulate_wellbore
from app.twin.catalog import get_well_meta
from app.ml.srp_performance import predict_srp


def _state():
    meta = get_well_meta("BGW-01")
    css = simulate_css(
        meta, steam_volume_t=520, inject_hours=72, soak_hours=48,
        cycle_day=18, cycle_number=4, spm=6.0, stroke_m=2.5, vfd_pct=70,
    )
    return meta, css


def test_srp_is_deterministic_and_physics_backed():
    meta, css = _state()
    a = simulate_srp(meta, css, 2.5, 6.0, 70, None)
    b = simulate_srp(meta, css, 2.5, 6.0, 70, None)
    assert a.polished_rod_max_kn == b.polished_rod_max_kn
    assert len(a.surface_card) == 97
    assert len(a.downhole_card) == 97
    assert a.polished_rod_max_kn > a.polished_rod_min_kn
    assert 0 <= a.volumetric_efficiency <= 1
    assert a.provenance == "SYNTHETIC"


def test_wellbore_is_deterministic():
    meta, css = _state()
    a = simulate_wellbore(meta, css, css.oil_rate_bopd)
    b = simulate_wellbore(meta, css, css.oil_rate_bopd)
    assert a == b
    assert 0 <= a.fluid_level_m <= 680
    assert a.wellhead_temperature_c <= css.reservoir_temperature_c


def test_srp_surrogate_loads_and_predicts():
    meta, css = _state()
    srp = simulate_srp(meta, css, 2.5, 6.0, 70, None)
    wb = simulate_wellbore(meta, css, css.oil_rate_bopd)
    result = predict_srp(
        srp_state=srp,
        parameters={"stroke_length": 2.5, "spm": 6.0},
        css=css,
        wellbore=wb,
    )
    assert result["status"] == "loaded"
    assert "PPRL_N" in result["predictions"]
    assert result["provenance"] == "MODEL_PREDICTION"
