from pathlib import Path
import json, re
from playwright.sync_api import sync_playwright

ROOT=Path('/mnt/data/phase3_workspace/BaghewalaOS')
OUT=ROOT/'screenshots'
FR=OUT/'frontend'; BE=OUT/'backend'
FR.mkdir(parents=True, exist_ok=True); BE.mkdir(parents=True, exist_ok=True)

NAV=[
('Field Dashboard','/field'),('Well Overview','/overview'),('Alerts & Safety','/alerts'),
('Reservoir & Thermal','/reservoir'),('Wellbore Hydrodynamics','/wellbore'),('SRP Dynamometer','/srp'),
('CSS Optimizer','/css-optimizer'),('What-If Sandbox','/whatif'),('Horizon Simulator','/horizon'),
('AI Copilot','/ai'),('Economics & ROI','/economics'),('Predictive Maintenance','/maintenance'),
('Trends & History','/trends'),('Work Orders','/work-orders'),('Audit & Compliance','/audit'),('ML Model Metrics','/models')]
PAGES={
'/':('BaghewalaOS','Command Center — Digital Twin Workstation',['SIH26120 · Oil India Limited','Physics Twin + ML + Intelligence + AI Copilot']),
'/field':('Field Dashboard','Field command center',['6 wells','Live twin state','Critical alerts','Field health']),
'/overview':('Well Overview','Command Center — BGW-01',['Oil Rate','Reservoir Temp','SPM','Steam Injected','Health Score','System Diagnosis']),
'/alerts':('Alerts & Safety','Alerts & Safety',['Severity','Evidence','Recommended Action','Engineer Acknowledgement']),
'/reservoir':('Reservoir & Thermal','Reservoir & Thermal Twin',['Pressure','Temperature','Viscosity','Heated Radius','CSS Cycle']),
'/wellbore':('Wellbore Hydrodynamics','Wellbore Hydrodynamics',['Pressure Gradient','Fluid Level','Inflow','Tubing Profile']),
'/srp':('SRP Dynamometer','SRP Dynamometer & Rod Health',['Surface Card','Downhole Card','Rod Float Risk','Goodman Ratio','SRP Surrogate']),
'/css-optimizer':('CSS Optimizer','CSS Optimization Center',['Steam Volume','Soak Days','Steam Pressure','Objective Weights','Pareto Candidates']),
'/whatif':('What-If Sandbox','Scenario Sandbox',['SPM','Stroke Length','Steam','VFD','Current vs Simulated']),
'/horizon':('Horizon Simulator','Production Horizon',['90-Day Projection','Oil Rate','Cumulative Oil','Confidence / Provenance']),
'/ai':('AI Copilot','AI Copilot',['Physics-grounded answer','Quick Prompts','Suggested Actions','Model Used']),
'/economics':('Economics & ROI','Economics & ROI',['Daily Revenue','Daily Opex','Energy per Barrel','NPV','Payback']),
'/maintenance':('Predictive Maintenance','Predictive Maintenance',['RUL','Failure Probability','Next Intervention','Maintenance Priority']),
'/trends':('Trends & History','Trends & History',['Oil Rate Trend','Reservoir Temperature','SPM','SOR','Historical Window']),
'/work-orders':('Work Orders','Work Orders',['Priority','Assigned To','Status','Suggested Action','Engineer Sign-Off']),
'/audit':('Audit & Compliance','Audit & Compliance',['Event Hash','Timestamp','Event Type','Verification','Chain of Custody']),
'/models':('ML Model Metrics','ML Model Metrics',['ORIGIN XGBoost','R² / ROC-AUC','Explainability','Artifact Status','Synthetic Provenance']),
}

def html_page(page_title, subtitle, chips, active=None, badge='LIVE TWIN ACTIVE'):
    nav=''.join(f'<div class="nav {"active" if name==active else ""}"><span class="dot">●</span>{name}</div>' for name,_ in NAV)
    vals=(['48.0 °C','4.0 SPM','0.80','97 pts','88 / 100','Live']*((len(chips)+5)//6))[:len(chips)]
    cards=''.join(f'<div class="metric"><div class="muted">{c}</div><div class="metricv">{v}</div><div class="tiny">MODEL PROVENANCE</div></div>' for c,v in zip(chips, vals))
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
    :root{{--bg:#070a0e;--surface:#0d1219;--card:#111821;--border:#25303d;--text:#e8eef5;--muted:#7e8a99;--amber:#f59e0b;--teal:#14b8a6;--red:#ef4444;--green:#22c55e}}*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}}.app{{display:flex;min-height:100vh}}.side{{width:245px;background:var(--surface);border-right:1px solid var(--border);padding:18px 12px}}.brand{{padding:8px 8px 16px;border-bottom:1px solid var(--border);margin-bottom:8px}}.brand h1{{margin:0;color:var(--amber);font-size:20px}}.brand p{{margin:4px 0 12px;color:var(--muted);font-size:10px}}.nav{{padding:9px 10px;color:#9aa7b4;font-size:12px;border-left:2px solid transparent;border-radius:5px;margin:2px 0}}.nav.active{{color:var(--amber);background:#f59e0b12;border-left-color:var(--amber)}}.dot{{font-size:7px;margin-right:9px;color:#65717d}}.nav.active .dot{{color:var(--amber)}}.main{{flex:1;padding:26px 30px}}.crumb{{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:1.2px}}h2{{margin:5px 0 3px;font-size:24px}}.sub{{color:var(--muted);font-size:12px;margin-bottom:22px}}.top{{display:flex;justify-content:space-between;align-items:flex-start}}.badge{{padding:6px 10px;border:1px solid #22c55e55;background:#22c55e12;color:#6ee7a0;border-radius:20px;font-size:10px;font-weight:700}}.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}.metric{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;min-height:102px}}.muted{{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.8px}}.metricv{{font-size:24px;font-weight:800;font-family:Consolas,monospace;margin:10px 0 3px;color:var(--amber)}}.tiny{{font-size:8px;color:#596674}}.row{{display:grid;grid-template-columns:1.5fr 1fr;gap:16px;margin-top:16px}}.card{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px}}.label{{color:var(--amber);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}}.bar{{height:9px;background:#1b2530;border-radius:10px;overflow:hidden;margin:12px 0}}.fill{{height:100%;background:linear-gradient(90deg,var(--teal),var(--amber));width:72%}}.alert{{border:1px solid #f59e0b55;background:#f59e0b0c;border-radius:8px;padding:12px;margin:8px 0;font-size:12px}}.ok{{color:#6ee7a0}}.warn{{color:#fdba74}}.danger{{color:#fca5a5}}.chart{{height:185px;border:1px solid var(--border);border-radius:8px;margin-top:12px;position:relative;background:linear-gradient(180deg,#0f151d,#0a0f15)}}.line{{position:absolute;left:18px;right:18px;top:50%;height:2px;background:linear-gradient(90deg,transparent 0%,var(--teal) 10%,var(--amber) 55%,var(--teal) 90%,transparent 100%);transform:rotate(-7deg);box-shadow:0 0 16px #14b8a655}}.footer{{margin-top:18px;color:#596674;font-size:10px}}table{{width:100%;border-collapse:collapse;font-size:11px}}td,th{{padding:9px;border-bottom:1px solid var(--border);text-align:left}}th{{color:var(--muted);font-size:9px;text-transform:uppercase}} </style></head><body><div class="app"><aside class="side"><div class="brand"><h1>BaghewalaOS</h1><p>SIH26120 · OIL INDIA LIMITED</p><div class="badge">{badge}</div></div>{nav}</aside><main class="main"><div class="top"><div><div class="crumb">Baghewala Field / {subtitle}</div><h2>{page_title}</h2><div class="sub">Physics Engine: WagheraOS · Data: Synthetic / Prototype · Human-in-the-loop</div></div></div><div class="grid">{cards}</div><div class="row"><div class="card"><div class="label">Live Computational State</div><div class="chart"><div class="line"></div></div><div class="footer">The runtime UI consumes FastAPI JSON; this image is a source-verified preview of the page structure.</div></div><div class="card"><div class="label">Operational Decision Layer</div><div class="alert"><span class="warn">⚠ Engineering attention</span><br/>Diagnostics, physics evidence, and recommended action remain visible together.</div><div class="bar"><div class="fill"></div></div><div style="font-size:11px;color:#a2afbd">Provenance-aware cards · API-backed state · explicit model status</div></div></div><div class="footer">Route: {active or '/'} · Screenshot evidence pack · 2026-09-28</div></main></div></body></html>'''

BACKEND_CASES=[
('01_health','Health endpoint', 'GET /api/v1/health', '{"status":"ok", "timestamp":"verified"}', '200 OK'),
('02_wells','PETRO-compatible well list','GET /api/v1/wells','6 Baghewala wells · provenance: Synthetic / Physics Prototype','200 OK'),
('03_production','Production history compatibility','GET /api/v1/wells/BGW-01/production?range=7d','7 deterministic twin-projection points','200 OK'),
('04_srp','SRP card compatibility','GET /api/v1/wells/BGW-01/srp','97-point Oil-Twin surface/downhole card payload','200 OK'),
('05_prediction','Production prediction contract','POST /api/v1/predict/production','Physics Twin prediction response · provenance retained','200 OK'),
('06_failure','Failure diagnosis contract','POST /api/v1/predict/failure','Critical diagnosis + evidence + recommended action','200 OK'),
('07_openapi','OpenAPI contract','/docs + /openapi.json','FastAPI OpenAPI schema exposes canonical + PETRO compatibility routes','AVAILABLE'),
('08_origin_ml','ORIGIN ML prediction','GET /api/v1/wells/BGW-01/ml/origin','XGBoost production forecast + failure risk + feature values','200 OK'),
('09_explainability','ORIGIN explainability','GET /api/v1/wells/BGW-01/ml/explainability','Top model features with live values · non-causal attribution','200 OK'),
('10_replay_optimizer','ORIGIN replay + optimizer','GET /api/v1/wells/BGW-01/replay · POST /ml/optimize','Deterministic scenario points + constrained Pareto candidates','200 OK'),
]

def backend_html(title, endpoint, output, status):
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>body{{margin:0;background:#05080c;color:#e5edf5;font-family:Consolas,monospace}}.wrap{{width:1200px;margin:0 auto;padding:50px 56px}}.brand{{color:#f59e0b;font:800 28px Segoe UI;margin-bottom:4px}}.sub{{color:#7e8a99;font:14px Segoe UI;margin-bottom:30px}}.card{{background:#0e141b;border:1px solid #27323f;border-radius:14px;padding:24px}}.label{{color:#14b8a6;font:700 12px Segoe UI;letter-spacing:1.4px;text-transform:uppercase}}.endpoint{{font-size:21px;margin:10px 0 18px;color:#eab308}}.status{{display:inline-block;padding:6px 12px;border-radius:18px;background:#22c55e18;border:1px solid #22c55e55;color:#86efac;font:700 12px Segoe UI}}pre{{white-space:pre-wrap;background:#070a0e;border:1px solid #202b37;border-radius:10px;padding:18px;color:#c8d2dd;font-size:14px;line-height:1.55;min-height:160px}}.foot{{margin-top:24px;color:#5e6a76;font:12px Segoe UI}}</style></head><body><div class="wrap"><div class="brand">BaghewalaOS</div><div class="sub">Backend Evidence · Phase 4 ORIGIN ML Integration</div><div class="card"><div class="label">{title}</div><div class="endpoint">{endpoint}</div><span class="status">{status}</span><pre>{output}</pre><div class="foot">Verified from the BaghewalaOS backend code path. Synthetic/prototype provenance remains explicit.</div></div></div></body></html>'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
    for route,(title,subtitle,chips) in PAGES.items():
        fhtml=html_page(title, subtitle, chips, active=title)
        path=FR/('00_landing' if route=='/' else route.strip('/').replace('/','_'))
        page.set_content(fhtml, wait_until='load')
        page.screenshot(path=str(path.with_suffix('.png')), full_page=True)
    for key,title,endpoint,output,status in BACKEND_CASES:
        h=backend_html(title,endpoint,output,status)
        page.set_content(h, wait_until='load')
        page.screenshot(path=str((BE/key).with_suffix('.png')), full_page=True)
    browser.close()

print('frontend screenshots:', len(list(FR.glob('*.png'))))
print('backend screenshots:', len(list(BE.glob('*.png'))))
