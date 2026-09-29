# BaghewalaOS — Complete Detailed Solution

**SIH26120 · Oil India Limited · Baghewala Heavy-Oil Field**  
**Integrated solution snapshot: 28 September 2026**

## 1. Executive solution

BaghewalaOS is a unified **well-to-surface digital-twin decision-support platform** for cyclic steam stimulation (CSS) and sucker-rod-pump (SRP) operations.

The final architecture is deliberately layered:

```text
                    ┌──────────────────────────────────────┐
                    │        React / TypeScript UI         │
                    │ Field · Physics · Optimization · AI  │
                    │ Maintenance · Economics · Audit      │
                    └──────────────────┬───────────────────┘
                                       │ REST / SSE
                    ┌──────────────────▼───────────────────┐
                    │              FastAPI                 │
                    │ canonical APIs + PETRO compatibility │
                    └──────────────────┬───────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       ▼                               ▼                               ▼
┌───────────────┐             ┌────────────────┐             ┌─────────────────┐
│ Physics Twin  │             │ ML / Analytics │             │ Intelligence    │
│               │             │                │             │                 │
│ CSS thermal   │             │ SRP surrogate  │             │ Diagnosis       │
│ Reservoir     │             │ ORIGIN XGBoost │             │ VFD governor    │
│ Wellbore      │             │ CSS surrogate  │             │ Pareto search   │
│ SRP dynamics  │             │ Failure risk   │             │ What-If          │
│ Nodal model   │             │ Explainability  │             │ Replay/Horizon  │
│ Risk          │             │ Metrics         │             │ Safety/HITL      │
│ Economics     │             │ Provenance      │             │ Causal chain    │
└───────┬───────┘             └───────┬────────┘             └───────┬─────────┘
        │                             │                              │
        └─────────────────────────────┼──────────────────────────────┘
                                      ▼
                           ┌────────────────────┐
                           │ AI Copilot / Audit │
                           │ physics-grounded   │
                           │ human-in-the-loop   │
                           └────────────────────┘
```

The important design principle is **physics first, ML second, decision intelligence third, AI last**. An ML prediction is not allowed to silently replace a mechanical/thermal safety calculation.

---

## 2. What each source repository contributed

### `WagheraOS`

Used for the focused SRP machine-learning capability.

Integrated into:

```text
backend/app/ml/artifacts/srp_performance_model.joblib
backend/app/ml/srp_performance.py
frontend/src/components/srp/SrpMlConditionCard.tsx
```

The model provides a learned cross-check for pump efficiency and load-card statistics. It is explicitly labelled as a synthetic-physics model and is **not** treated as field-calibrated evidence.

### `WagheraOS`

Used for the core heavy-oil physics direction.

The final twin keeps the coupled relationship:

```text
steam → heat → temperature → viscosity → mobility/inflow
      → production → pump loading → rod risk → economics
```

It contributes the reservoir/thermal/wellbore/SRP modelling philosophy and deterministic dynamometer-card behaviour.

### `WagheraOS`

Used as a bounded product/API pattern source.

Integrated features:

- compatibility endpoints for wells and production history;
- SRP-card response contract;
- production/failure prediction response structure;
- command-centre health-score visual language;
- clearer API/data-provenance documentation.

The PETRO backend was **not merged wholesale**.

### `WagheraOS` / ORIGIN

Integrated as the ML/replay/optimization cross-check layer.

The final application imports only the bounded capabilities needed by BaghewalaOS:

- XGBoost production model;
- XGBoost failure-risk model;
- model metrics registry;
- live feature alignment;
- model-level explainability;
- constrained candidate scoring;
- Pareto alternatives;
- deterministic strategy replay.

The source repository remains independent.

---

## 3. Core physics solution

### 3.1 CSS / reservoir

The thermal model follows the physical chain from steam injection to heated-zone behaviour and heavy-oil mobility. Reservoir temperature affects viscosity; viscosity changes mobility and inflow; inflow influences the produced oil rate.

Relevant modules:

```text
backend/app/physics/css.py
backend/app/physics/thermal.py
backend/app/physics/reservoir.py
backend/app/physics/fluids.py
backend/app/physics/nodal.py
```

### 3.2 Wellbore

The wellbore layer produces a pressure/temperature/viscosity profile and accounts for fluid transport effects and drag.

```text
backend/app/physics/wellbore.py
```

### 3.3 SRP

The SRP layer computes:

- rod/pump kinematics;
- polished-rod load envelope;
- surface and downhole dynamometer cards;
- fillage;
- rod stress / Goodman ratio;
- float and impact indicators;
- gearbox / structural loading.

The final SRP payload contains deterministic **97-point** surface and downhole cards for the configured wells.

### 3.4 Risk

Risk is derived from the physics state instead of being a cosmetic random score.

The risk chain includes:

```text
rod loading
+ float / impact
+ thermal / viscosity state
+ well fingerprint
+ historical synthetic tendency
→ failure probability
→ equipment health
→ remaining useful life
```

### 3.5 Economics

Economics uses the current synthetic assumptions for:

- oil revenue;
- steam cost;
- electricity;
- maintenance;
- downtime;
- intervention;
- net operating value.

All assumptions remain explicit in the source rather than being presented as official Oil India limits.

---

## 4. ML solution

### 4.1 SRP surrogate

The dedicated SRP model predicts several mechanically useful outputs from the SRP operating state.

Its metadata contains the model version, residual uncertainty, source dataset description, and synthetic-data caveat.

### 4.2 ORIGIN XGBoost production model

The imported ORIGIN production model uses 21 engineered features:

```text
reservoir_temperature
reservoir_pressure
oil_viscosity
oil_api
water_cut
steam_volume
injection_pressure
injection_duration
soak_time
stroke_length
spm
vfd_setting
pump_efficiency
rod_load
sor
energy_per_barrel
production_change
temperature_change
viscosity_change
rolling_production
rolling_sor
```

The model bundle reports a chronological 80/20 validation split on 216 synthetic samples, with the source repository reporting:

- XGBoost production R² ≈ **0.968**;
- XGBoost production MAE ≈ **0.808 BOPD**;
- XGBoost failure-risk ROC-AUC ≈ **0.977**;
- XGBoost failure-risk F1 ≈ **0.935**.

These are **source-repository synthetic-demo validation metrics**, not field accuracy claims.

### 4.3 Explainability

The final UI/API exposes model-level feature importance with live feature values. This is intentionally described as **explanatory attribution, not causal inference**.

### 4.4 Model disagreement handling

A critical design improvement is that physics and ML failure estimates are not blindly averaged.

For optimization scoring:

```text
risk_used = max(physics_failure_probability,
                ml_failure_probability)
```

This conservative rule prevents a low ML score from masking a high computed mechanical risk.

The API also returns:

```text
physics_failure_probability
ml_failure_probability
model_disagreement
conservative_failure_probability_used
```

This makes disagreement visible instead of hiding it.

---

## 5. Optimization solution

There are now two complementary optimization layers.

### 5.1 BaghewalaOS physics intelligence

The existing decision engine handles the primary field optimization logic, safety interlocks, VFD governance, scenario branches, and economics.

### 5.2 ORIGIN ML cross-check optimizer

A bounded candidate search evaluates operating combinations using the imported ORIGIN models and then re-evaluates the selected candidates with the actual BaghewalaOS physics twin.

Outputs include:

- production-focus alternative;
- efficiency-focus alternative;
- reliability-focus alternative;
- recommended candidate selected from the evaluated alternatives;
- number of evaluated candidates;
- Pareto count;
- model disagreement;
- safety gate and disclaimers.

The optimization is therefore **surrogate-assisted but physics-verified**, not “ML-only.”

---

## 6. Replay / simulation solution

The new replay endpoint provides deterministic scenario playback without mutating the live session.

Strategies:

```text
conservative
balanced
aggressive
low_energy
```

Each replay point contains:

- oil rate;
- reservoir temperature;
- viscosity;
- SOR;
- physics failure risk;
- ML failure risk;
- equipment health;
- rod float risk;
- economic value.

This gives the operator a consistent way to compare scenarios before any control action is considered.

---

## 7. Full operator workflow

### Field triage

```text
Field Dashboard
→ select high-urgency well
→ Overview
→ diagnosis + VFD governor
→ inspect SRP / reservoir / wellbore
```

### Mechanical investigation

```text
SRP Dynamometer
→ surface/downhole card
→ fillage
→ rod stress / Goodman
→ float / impact
→ SRP ML cross-check
```

### Thermal / reservoir investigation

```text
Reservoir & Thermal
→ pressure
→ temperature
→ viscosity
→ heated radius
→ CSS cycle state
```

### Intervention design

```text
What-If
→ replay
→ horizon branches
→ CSS optimizer
→ ORIGIN ML Pareto cross-check
→ economics
```

### Execution governance

```text
Recommendation
→ safety gate
→ human review
→ work order / dispatch
→ audit record
→ observation
→ calibration history
```

---

## 8. API surface added/verified

### Canonical BaghewalaOS

```text
GET  /api/v1/health
GET  /api/v1/field/snapshot
GET  /api/v1/wells/{well_id}/twin
GET  /api/v1/wells/{well_id}/physics
GET  /api/v1/wells/{well_id}/diagnosis
GET  /api/v1/wells/{well_id}/alerts
GET  /api/v1/wells/{well_id}/vfd
POST /api/v1/wells/{well_id}/vfd/apply
POST /api/v1/wells/{well_id}/optimize
POST /api/v1/wells/{well_id}/css_optimize
POST /api/v1/wells/{well_id}/whatif
GET  /api/v1/wells/{well_id}/horizon
GET  /api/v1/wells/{well_id}/compare
GET  /api/v1/wells/{well_id}/branches
GET  /api/v1/wells/{well_id}/maintenance
GET  /api/v1/models/metrics
POST /api/v1/telemetry/ingest
GET  /api/v1/telemetry/stream
POST /api/v1/copilot/chat
GET  /api/v1/audit/logs
```

### PETRO compatibility

```text
GET  /api/v1/wells
GET  /api/v1/wells/{well_id}/production
GET  /api/v1/wells/{well_id}/srp
POST /api/v1/predict/production
POST /api/v1/predict/failure
```

### ORIGIN integration

```text
GET  /api/v1/wells/{well_id}/ml/origin
GET  /api/v1/wells/{well_id}/ml/explainability
POST /api/v1/wells/{well_id}/ml/optimize
GET  /api/v1/wells/{well_id}/replay
```

---

## 9. Frontend solution

The frontend contains 16 primary operator pages plus the landing experience:

```text
Landing
Field Dashboard
Well Overview
Alerts & Safety
Reservoir & Thermal
Wellbore Hydrodynamics
SRP Dynamometer
CSS Optimizer
What-If Sandbox
Horizon Simulator
AI Copilot
Economics & ROI
Predictive Maintenance
Trends & History
Work Orders
Audit & Compliance
ML Model Metrics
```

The ML Model Metrics page now contains an ORIGIN ML Cross-Check panel with:

- production forecast;
- failure risk;
- selected model metrics;
- model-level drivers;
- provenance warning;
- calibration requirement.

The global well selector was also corrected to the actual six configured catalog wells:

```text
BGW-01 · BGW-04 · BGW-07 · BGW-09 · BGW-12 · BGW-15
```

---

## 10. Screenshots / evidence

The project contains:

```text
screenshots/frontend/
  17 page previews

screenshots/backend/
  10 backend evidence images
```

The screenshot README explicitly distinguishes **source-verified frontend previews** from actual browser runtime captures because the supplied workspace has an incomplete `node_modules` tree.

No image is presented as a browser-runtime capture unless it was actually produced from a runtime path.

---

## 11. Verification status

### Backend

Phase 4 integration tests:

```text
10 / 10 passed
```

Coverage includes:

- ORIGIN artifact loading;
- 21-feature alignment;
- production prediction endpoint;
- explainability endpoint;
- constrained optimizer;
- conservative physics/ML risk fusion;
- deterministic replay;
- replay API;
- combined model metrics registry.

Python compile check:

```text
backend/app → PASS
```

Earlier stabilization and integration gates remain documented in the phase reports.

### Frontend

The source has been updated and imported locally, but the current sandbox cannot certify a complete Vite production build because its existing `node_modules` is incomplete. The observed error is missing ambient type package content under `node_modules/@types`, not a successful application build.

Required local final gate:

```powershell
cd frontend
npm ci
npm run build
```

This should be run in a normal network-enabled development environment.

---

## 12. Data / safety / trust boundaries

This solution is a **SIH prototype**.

The current dataset is synthetic / physics-informed. The model artifacts were trained on synthetic demo data. They are not evidence of field accuracy.

The solution intentionally retains:

- provenance labels;
- model-source labels;
- synthetic-data disclaimers;
- explicit physics vs ML distinction;
- conservative failure-risk fusion;
- human-in-the-loop controls;
- audit records;
- safety interlocks.

No current dashboard claim should be interpreted as an official Oil India operating limit.

---

## 13. Production-readiness roadmap

The architecture is ready for the following future work without redesigning the application core:

### Data integration

Connect real:

- SCADA / historian telemetry;
- production measurements;
- BHP / pressure surveys;
- DTS / temperature;
- PVT / viscosity data;
- SRP dynamometer measurements.

### ML calibration

Replace synthetic training data with governed field datasets and record:

- dataset version;
- feature schema;
- train/validation/test period;
- model version;
- calibration metrics;
- drift indicators.

### Security / operations

Add:

- authentication;
- RBAC;
- approval workflows;
- persistent work-order storage;
- production-grade audit storage;
- monitoring and alerting;
- deployment manifests.

### Mobile

Evaluate the existing WELLORA / Capacitor directions only after the web core is stable. Mobile packaging should consume the same canonical API rather than fork the business logic.

---

## 14. Final architecture decision

**BaghewalaOS is the canonical core.**

The other repositories are capability sources, not competing roots.

```text
BaghewalaOS
├── canonical physics + twin
├── canonical API + state contracts
├── canonical UI + operator workflow
├── canonical safety / audit / HITL
│
├── SRP Performance Model      → bounded SRP ML adapter
├── WagheraOS                → physics capability reference/integration
├── WagheraOS              → API/UI/documentation patterns
└── WagheraOS ORIGIN        → ML + explainability + optimizer + replay
```

This keeps the solution understandable, testable, demoable, and extensible without creating a merged repository that is difficult to maintain.
