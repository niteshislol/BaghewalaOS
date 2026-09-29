# BaghewalaOS Phase 2 — SRP + Oil-Twin Integration

Date: 2026-09-28

## Scope

This phase integrates the strongest bounded pieces from:

- `SIH26120/WagheraOS`
- `SIH26120/WagheraOS`

The integration deliberately does **not** merge the repositories wholesale. BaghewalaOS remains the authoritative application core.

## Integrated

### WagheraOS physics

BaghewalaOS SRP and wellbore adapters now execute the WagheraOS mechanical solver rather than the earlier random mock tail. The twin generates deterministic surface and downhole dynamometer cards with 97 points each.

The existing CSS/reservoir/fluid/nodal modules remain the authoritative coupled physics layer.

### WagheraOS

The trained SRP bundle was converted into a standalone BaghewalaOS artifact at:

`backend/app/ml/artifacts/srp_performance_model.joblib`

The `app.ml.srp_performance` adapter returns predictions, uncertainty metadata, provenance, model version, and the original model caveat.

The ML model is explicitly a **cross-check**, not a safety authority: its metadata states that it was trained on the source repository's synthetic physics and is not evidence of real Baghewala field accuracy. Field calibration is required before operational use.

## Frontend changes

The SRP page no longer uses the previous hardcoded:

- 94.2% confidence score
- Fluid Pound diagnosis
- 88.4 kN peak load
- mock current/previous/baseline loops
- static rod taper table

It now consumes the live `/api/v1/wells/{well_id}/twin` payload and renders:

- live surface/downhole dynamometer cards
- live rod float risk
- pump fillage
- Goodman ratio
- rod stress
- equipment health
- live SRP surrogate predictions
- simulation/provenance indicators

## Verification

Backend unit/regression suite: **19/19 passed**.

Live Uvicorn checks:

- `/api/v1/health` → 200
- `/api/v1/wells/BGW-01/twin` → 200
- `/api/v1/models/metrics` → 200, SRP surrogate status `loaded`

Catalog physics checks:

- BGW-01, BGW-04, BGW-07, BGW-09, BGW-12, BGW-15 all produced 97 surface + 97 downhole points and loaded the surrogate model.

## Remaining verification limitation

The workspace does not contain a complete installed frontend dependency tree. A final `npm run build` therefore cannot be used as evidence of a successful browser bundle in this environment; TypeScript currently fails first on missing ambient type packages from the incomplete `node_modules` tree.

The application source itself has been updated to remove the SRP page's mock-data dependencies.

## Next bounded integration targets

1. Bring the strongest product/documentation/API patterns from `WagheraOS` into BaghewalaOS without replacing the canonical backend schema.
2. Bring optimizer/replay/model pieces from `WagheraOS` behind adapters.
3. Add the SRP model validation/cross-check page and confidence/uncertainty visualization.
4. Only after those are stable, evaluate mobile packaging from the remaining repos.
