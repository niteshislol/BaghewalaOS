import os
from pathlib import Path

base = Path(r"c:\Users\nites\Downloads\SIH26120\BaghewalaOS\frontend\src")

# types.ts
types_ts = base / "types.ts"
types_ts.write_text("""
export type SrpTwinState = any;
export type ReservoirTwinState = any;
export type WellboreTwinState = any;
export type RealTimeTelemetry = any;
export type CSSParameters = any;
export type SRPParameters = any;
""")

# services/index.ts
services_index = base / "services" / "index.ts"
services_index.parent.mkdir(parents=True, exist_ok=True)
services_index.write_text("""
export const digitalTwinService = {
  getSrpTwin: async () => ({}),
  getReservoirTwin: async () => ({}),
  getWellboreTwin: async () => ({}),
};
export const cssCycleService = {
  getCurrentCycle: async () => ({}),
};
""")

# mock files
mock_dir = base / "mock"
mock_dir.mkdir(parents=True, exist_ok=True)
(mock_dir / "telemetry.ts").write_text("export const mockTimeseries = [];")
(mock_dir / "aiInsights.ts").write_text("export const mockAiInsight = {};")

dt_dir = mock_dir / "digitalTwin"
dt_dir.mkdir(parents=True, exist_ok=True)
(dt_dir / "srp.ts").write_text("""
export const mockRodTaperAnalysis = [];
export const mockDynoLoops = {
  current: { surface: [], label: '' },
  previous: { surface: [], label: '' },
  baseline: { surface: [], label: '' }
};
""")

(dt_dir / "wellbore.ts").write_text("""
export const mockWellboreDepthProfile = [];
""")

(dt_dir / "reservoir.ts").write_text("""
export const mockViscosityVsTempCurve = [];
export const mockReservoirThermalTrajectory = [];
""")

print("Successfully created mock files to satisfy Vite!")
