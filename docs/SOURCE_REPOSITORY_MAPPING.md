# Source Repository Mapping

| Source repository | Selected capability | Final BaghewalaOS location | Integration rule |
|---|---|---|---|
| `WagheraOS` | SRP performance surrogate | `backend/app/ml/srp_performance.py`, model artifact | bounded adapter; cross-check only |
| `WagheraOS` | coupled heavy-oil physics direction | `backend/app/physics/*`, twin contracts | preserve BaghewalaOS API boundary |
| `WagheraOS` | API contracts, command-center UI pattern, documentation | `backend/app/integrations/petro_contract.py`, `HealthScoreGauge.tsx`, docs | compatibility layer; no wholesale merge |
| `WagheraOS` | XGBoost models, feature alignment, explainability, Pareto/replay patterns | `backend/app/integrations/waghera_origin.py`, `backend/app/intelligence/replay.py`, model artifacts, `OriginMlPanel.tsx` | bounded ML/intelligence layer |

## Explicitly not merged

The remaining source repositories in the original SIH26120 archive were not folded into the canonical core merely for completeness. Their capabilities should be evaluated later against concrete requirements.

The architectural rule remains:

> one clean core + one bounded capability at a time.
