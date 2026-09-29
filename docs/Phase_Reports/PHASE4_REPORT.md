# BaghewalaOS Phase 4 — ORIGIN ML / Replay / Optimization Integration

Date: 28 September 2026

## Scope

Integrated bounded capabilities from `SIH26120/WagheraOS` into the stabilized BaghewalaOS core.

## Integrated

### ORIGIN ML artifacts

Copied the trained source-repo XGBoost bundles into:

```text
backend/app/ml/artifacts/waghera_origin/production_model.joblib
backend/app/ml/artifacts/waghera_origin/failure_model.joblib
backend/app/ml/artifacts/waghera_origin/metrics.json
```

### Feature adapter

`backend/app/integrations/waghera_origin.py` maps BaghewalaOS live twin state into the exact 21 ORIGIN training features.

### Prediction API

```text
GET /api/v1/wells/{well_id}/ml/origin
GET /api/v1/wells/{well_id}/ml/explainability
```

### Optimization

```text
POST /api/v1/wells/{well_id}/ml/optimize
```

The optimizer is constrained and uses the BaghewalaOS physics twin to verify candidate states. Physics failure probability is retained conservatively when it is higher than the ML estimate.

### Replay

```text
GET /api/v1/wells/{well_id}/replay?days=30&strategy=balanced
```

Strategies:

- conservative
- balanced
- aggressive
- low_energy

### Frontend

`frontend/src/components/OriginMlPanel.tsx` is embedded into the ML Model Metrics page and displays:

- production forecast;
- failure risk;
- source model metrics;
- feature-level explanation;
- synthetic-data provenance;
- calibration caveat.

The global well selector was corrected to the actual six-well catalog.

## PETRO compatibility upgrade

The PETRO compatibility production/failure endpoints now include the ORIGIN model cross-check while preserving BaghewalaOS physics output and provenance.

## Safety / trust behavior

The ML layer never silently overrides computed physics risk.

The integrated optimizer returns:

```text
physics_failure_probability
ml_failure_probability
conservative_failure_probability_used
model_disagreement
safety_gate = ADVISORY_ONLY
```

## Verification

```text
pytest -q                         → 29 passed
Representative API sweep         → 18/18 passed
All six well ORIGIN optimization  → passed
Frontend local-import scan       → 0 missing imports
Python compileall                 → passed
```

The source repository's XGBoost bundles emit compatibility warnings when loaded in this sandbox because they were serialized under a different XGBoost environment. The models still load and infer successfully here. A production deployment should pin the training/runtime XGBoost version or re-export the model using a governed model serialization path.

## Frontend build status

A final Vite build is not certified in this sandbox because the existing `node_modules` tree is incomplete. `npm run build` fails before application compilation on missing `@types/*` package contents.

The final local gate remains:

```powershell
cd frontend
npm ci
npm run build
```

No frontend build failure is represented as a successful build claim in this package.
