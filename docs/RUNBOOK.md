# BaghewalaOS Runbook

## Backend

From the project root:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health:

```text
http://localhost:8000/api/v1/health
```

OpenAPI:

```text
http://localhost:8000/docs
```

## Frontend

```powershell
cd frontend
npm ci
npm run dev
```

The Vite proxy sends `/api` traffic to the FastAPI service configured in `vite.config.ts`.

## Production build gate

```powershell
cd frontend
npm ci
npm run build
```

## Test suite

```powershell
cd <project-root>
$env:PYTHONPATH = "backend"
python -m pytest -q
```

## Important demo checks

```text
GET  /api/v1/health
GET  /api/v1/wells/BGW-01/twin
GET  /api/v1/wells/BGW-01/ml/origin
GET  /api/v1/wells/BGW-01/ml/explainability
POST /api/v1/wells/BGW-01/ml/optimize
GET  /api/v1/wells/BGW-01/replay?days=30&strategy=balanced
GET  /api/v1/models/metrics
```

## Demo narrative

1. Start backend.
2. Start frontend.
3. Select a well from the sidebar.
4. Open Overview.
5. Inspect Reservoir → Wellbore → SRP.
6. Open CSS Optimizer / What-If.
7. Open ML Model Metrics to show ORIGIN cross-check + explainability.
8. Open Trends / Maintenance / Economics.
9. Use AI Copilot for a physics-grounded question.
10. Show Audit for traceability.

## Trust note

All current demo data and model artifacts are synthetic/prototype material. Do not convert demo recommendations into field operating instructions without proper field calibration, engineering review, safety controls, and governance.
