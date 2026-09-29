import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))

from fastapi.testclient import TestClient

from app.main import app
from app.integrations.waghera_origin import feature_row, origin_optimize, predict
from app.intelligence.replay import replay
from app.twin.compose import compose_twin


def test_origin_artifacts_load():
    out = predict(compose_twin('BGW-01'))
    assert out['production_bopd'] > 0
    assert 0 <= out['failure_probability'] <= 1
    assert out['models']['production']['model_name'] == 'XGBoost'


def test_feature_alignment_has_all_21_features():
    row = feature_row(compose_twin('BGW-01'))
    assert len(row) == 21
    assert row['spm'] > 0
    assert row['rod_load'] > 0


def test_explainability_route():
    c = TestClient(app)
    r = c.get('/api/v1/wells/BGW-01/ml/explainability')
    assert r.status_code == 200
    assert len(r.json()['explanations']) == 2


def test_origin_prediction_route():
    c = TestClient(app)
    r = c.get('/api/v1/wells/BGW-01/ml/origin')
    assert r.status_code == 200
    body = r.json()
    assert body['provenance'] == 'MODEL_PREDICTION'
    assert body['models']['failure']['model_name'] == 'XGBoost'


def test_origin_optimizer_returns_pareto_options():
    r = origin_optimize('BGW-01', max_candidates=24)
    assert r['n_candidates'] == 24
    assert len(r['pareto_options']) >= 3
    assert r['safety_gate'] == 'ADVISORY_ONLY'


def test_optimizer_fuses_risk_conservatively():
    r = origin_optimize('BGW-01', max_candidates=16)
    rec = r['recommended']
    fusion = rec['risk_fusion']
    assert fusion['conservative_failure_probability_used'] >= fusion['ml_failure_probability']
    assert fusion['conservative_failure_probability_used'] >= fusion['physics_failure_probability']


def test_replay_does_not_need_session_mutation():
    a = replay('BGW-01', days=5, strategy='balanced')
    b = replay('BGW-01', days=5, strategy='balanced')
    assert len(a['points']) == 6
    assert a['points'] == b['points']


def test_replay_strategies_exist():
    for strategy in ('conservative', 'balanced', 'aggressive', 'low_energy'):
        r = replay('BGW-01', days=2, strategy=strategy)
        assert r['strategy'] == strategy
        assert len(r['points']) == 3


def test_replay_route():
    c = TestClient(app)
    r = c.get('/api/v1/wells/BGW-01/replay', params={'days': 3, 'strategy': 'low_energy'})
    assert r.status_code == 200
    assert r.json()['points'][-1]['day'] == 3


def test_models_metrics_include_origin():
    c = TestClient(app)
    r = c.get('/api/v1/models/metrics')
    assert r.status_code == 200
    assert 'waghera_origin_ml' in r.json()
    assert r.json()['waghera_origin_ml']['status'] == 'loaded'
