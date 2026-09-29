# BaghewalaOS - Product Idea and System Blueprint

## 1. Product Thesis

BaghewalaOS is the integrated operating system for the Baghewala heavy-oil field: one surface for field overview, coupled reservoir/wellbore/SRP physics, optimization, intelligence, AI assistance, maintenance, economics, work orders, trends, models, and compliance.

Its product promise is to turn a well-to-surface digital twin into an operational loop:

`observe -> explain -> simulate -> optimize -> approve -> dispatch -> learn`

The system is designed for Oil India Limited and SIH26120. Demo outputs are synthetic physics-informed values and must remain visibly labeled until real SCADA, DTS, BHP, PVT, and production data are connected.

## 2. Target Users

- Field engineer: live well health, alerts, diagnosis, VFD/SPM advice, and action dispatch.
- Reservoir engineer: thermal cycle, heated radius, viscosity, CSS design, and SOR.
- Artificial-lift/reliability engineer: SRP cards, rod stress, fillage, drag, and RUL.
- Production manager: field KPIs, well ranking, production opportunity, energy, and economics.
- Operations/compliance lead: work orders, audit trail, sign-off, and model/data provenance.
- Executive user: concise field health, production, risk, NPV, and resource allocation.

## 3. UI/UX System

### Visual direction

The intended interface is a dark industrial control room: deep navy surfaces, amber primary actions, teal secondary signals, blue informational accents, red danger states, compact KPI cards, monospace engineering values, and fixed left navigation. The visual language should support scanning and repeated operational work rather than marketing presentation.

### Shell and navigation

- Landing page introduces the field and routes into the operational workspace.
- Fixed sidebar contains five groups: Overview, Physics Twin, Optimization, AI/Intelligence, and Operations.
- Well selector keeps the active asset visible globally.
- Main content uses page headers, KPI grids, cards, alert badges, charts, tables, and action buttons.
- Toaster feedback communicates refresh, optimization, AI, VFD, and error outcomes.
- A live-twin footer indicates streaming and physics engine status.

### Route map

- `/field`: field KPIs, six-well grid, health, phase, SOR, failure risk, and action priority plan.
- `/overview`: well KPIs, diagnosis, VFD governor, alerts, and apply/advisory action.
- `/reservoir`: reservoir temperature, pressure, viscosity, heated radius, thermal state, and CSS views.
- `/wellbore`: transport, thermal profile, pressure, cooling, and hydrodynamics.
- `/srp`: dynamometer, polished-rod loading, pump fillage, and rod health.
- `/css-optimizer`: seven-objective CSS optimization and recommended cycle.
- `/whatif`: parameter deltas and scenario simulation.
- `/horizon`: 90-day forecast and strategy branches.
- `/alerts`: operational alerts and safety triage.
- `/ai`: role-based AI Copilot for field engineer, reservoir expert, and executive modes.
- `/economics`: NPV, steam cost, energy, and operating value.
- `/maintenance`: RUL, fatigue, inspection, and intervention planning.
- `/trends`: telemetry history and correlations.
- `/work-orders`: operational execution and maintenance dispatch.
- `/audit`: tamper-evident event history.
- `/models`: model metrics and transparency.

## 4. Core Workflows

### Field-to-well triage

Field Dashboard -> sort action priority -> select a well -> Overview -> read diagnosis and VFD recommendation -> inspect alert evidence -> choose advisory or dispatch path.

### CSS optimization

CSS Optimizer -> adjust steam volume, injection duration, soak, cutoff, and constraints -> run Pareto search -> compare oil/SOR/risk/energy -> open explanation -> approve a candidate for the next cycle.

### Mechanical safety

SRP -> inspect card and load margins -> compare viscosity/drag/fillage -> run governor -> apply only when confidence and safety interlocks allow -> record the decision in audit.

### Horizon planning

What-If -> compare current and modified parameters -> Horizon -> compare conservative, balanced, aggressive, and low-energy branches -> inspect economics -> create a work order or cycle proposal.

### AI Copilot

Select role -> ask a telemetry or engineering question -> physics gate answers direct state questions without an LLM -> complex reasoning receives twin context -> suggested parameters and rationale appear -> human decides whether to act.

### Closed-loop operations

Alert -> causal explanation -> recommendation -> work order -> field execution -> observation -> audit and recalibration history.

## 5. Backend Architecture

The FastAPI backend in `backend/app/main.py` exposes health, field, well twin, physics, diagnosis, alerts, VFD, optimization, What-If, horizon, telemetry/SSE, AI, audit, and model endpoints.

Major layers:

- `app/twin/catalog.py`: six distinct synthetic wells and fingerprints.
- `app/twin/compose.py`: integrated response assembled from reservoir, CSS, wellbore, SRP, risk, economics, and session state.
- `app/twin/session.py`: runtime overlays, faults, simulation day, learned thermal bias, observations, and history.
- `app/physics/css.py`: injection/soak/production cycle and thermal-viscosity response.
- `app/physics/thermal.py`: heated zone, Marx-Langenheim area, conduction, and produced-fluid heat loss.
- `app/physics/reservoir.py`: radial inflow, heated-zone pressure, compressibility, and condensate material balance.
- `app/physics/wellbore.py`: annular rod drag, cooling profile, pressure traverse, and fluid properties.
- `app/physics/srp.py`: pumping unit, rod string, pump, kinematics, load card, drag, and mechanical outputs.
- `app/physics/risk.py`: failure probability, equipment health, safety factor, and RUL.
- `app/physics/economics.py`: oil revenue, steam, electricity, maintenance, downtime, intervention, and net value.
- `app/intelligence/engine.py`: diagnosis, maintenance, VFD governor, What-If, horizon, field ranking, and alert logic.
- `app/intelligence/decision.py`: safety interlocks, causal/decision functions, field allocation, and human-in-the-loop controls.
- `app/ai/copilot.py`: Gemini integration with physics-grounding gate and fallback.
- `app/audit/trail.py`: hash-based audit entries and field dispatch records.
- `app/ml`: optional trained/surrogate predictions and optimization assets.

## 6. Frontend Architecture

The intended frontend is React + TypeScript + Vite. `src/services/api.ts` centralizes Axios calls under `/api/v1`, including twin, physics, intelligence, optimization, simulation, AI, telemetry, models, audit, and dispatch APIs. `src/stores/wellStore.ts` owns selected well, twin, field snapshot, alerts, live telemetry, and SSE cleanup.

The current codebase contains two partially overlapping frontend patterns: a BaghewalaOS-native dashboard and older pages that reference missing `types`, `mock`, service, and UI modules. The product idea should converge on one design system and one API contract before expanding routes.

## 7. Physics and Intelligence Contract

The core causal chain is:

`steam -> heat -> temperature -> viscosity -> mobility/inflow -> oil rate -> pump load -> rod drag/float -> risk -> economics`

Important models and behaviors:

- CSS energy and thermal decay.
- Temperature-dependent heavy-oil viscosity.
- Wellbore cooling, hydrostatic pressure, and annular drag.
- SRP kinematics, polished-rod load, fillage, fatigue, and rod floating.
- Risk aggregation into failure probability and RUL.
- Pareto optimization across production, SOR, risk, energy, and value.
- VFD governor with constraints and advisory/blocked outcomes.
- Forecast branches, What-If deltas, and field allocation.
- Physics-first AI responses and Gemini fallback.
- SHA-256-style event integrity for audit and dispatch.

## 8. Data and Trust Model

The product must show `synthetic_physics_informed` or equivalent provenance beside demo metrics. Assumptions live centrally in `physics/assumptions.py`, including economics, thermal limits, wellbore properties, SRP boundaries, and the disclaimer that values are not official Oil India limits.

Production readiness requires:

- shared response schemas generated from the backend contract;
- persistence beyond the current runtime/session approach;
- authentication and role-based permissions;
- real historian/SCADA connectors;
- calibration and model version records;
- integration tests for every route used by the UI;
- explicit operator confirmation before dispatch or control.

## 9. Current State and Main Risks

The platform has a compelling product surface and a strong physics/intelligence vocabulary, but the repository currently shows integration drift: some modules reference package paths or adapters that are absent, while the frontend includes incomplete page families. This is recoverable, but feature additions should pause until one vertical path is stable and the production build is green.

## 10. Recommended Roadmap

1. Keep the current native field dashboard, Overview, Alerts, and AI Copilot as the first stable slice.
2. Consolidate the frontend to one page/component/type/service architecture.
3. Add typed API clients generated or validated from FastAPI schemas.
4. Stabilize compose_twin and all physics state contracts with unit tests.
5. Connect CSS/SRP/What-If/Horizon pages to real endpoints rather than placeholders.
6. Complete audit, work-order, and sign-off persistence.
7. Add model cards, data-quality ingestion, SCADA adapters, RBAC, and deployment packaging.

## 11. North-Star Outcome

An engineer can select any field well, understand its current physical state, see why risk is rising, test an intervention, receive a constrained recommendation, dispatch a human-approved work order, and later compare the result with the prediction in one consistent operating system.
