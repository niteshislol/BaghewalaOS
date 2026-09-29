export type CSSPhase = 'INJECTION' | 'SOAK' | 'PRODUCTION' | 'CUTOFF' | string;

export interface ReservoirParameters {
  apiGravity: number;
  depth: number;
  reservoirTemp: number;
  reservoirPressure: number;
  asphalteneContent: number;
  initialViscosity: number;
  formationName: string;
  [key: string]: any;
}

export interface CSSParameters {
  steamVolume: number;
  injectionPressure: number;
  injectionTemp: number;
  soakTimeDays: number;
  productionCutoffRate: number;
  cycleNumber: number;
  [key: string]: any;
}

export interface SRPParameters {
  strokeLength: number;
  spm: number;
  plungerDiameter: number;
  rodDiameter: number;
  pumpDepth: number;
  [key: string]: any;
}

export interface DynamometerPoint {
  position: number;
  surfaceLoad: number;
  downholeLoad: number;
  [key: string]: any;
}

export interface DynamometerCardData {
  surfacePoints: DynamometerPoint[];
  downholePoints: DynamometerPoint[];
  anomalyType: string;
  confidence: number;
  cardDescription: string;
  [key: string]: any;
}

export interface OscilloscopeFrame {
  timestamp?: number;
  rodLoadLbs: number;
  motorCurrentAmps: number;
  downholePressureBar: number;
  fluidLevelM: number;
  [key: string]: any;
}

export interface RealTimeTelemetry {
  timestamp: number;
  isoTime: string;
  cycleDays: number;
  phase: CSSPhase;
  bottomHoleTemp: number;
  viscosity: number;
  fluidTemperature: number;
  oilRate: number;
  waterRate: number;
  waterCut: number;
  steamInjectionRate?: number;
  spm: number;
  instantaneousRodPosition: number;
  instantaneousRodLoad: number;
  polishedRodPeakLoad: number;
  polishedRodMinLoad: number;
  motorPowerKw: number;
  motorCurrentAmps: number;
  casingPressureBar: number;
  tubingHeadPressureBar?: number;
  downholePressureBar: number;
  acousticFluidLevelMeters: number;
  pumpFillagePercent: number;
  rodFloatingDetected: boolean;
  steamOilRatio: number;
  dailyOilBbls?: number;
  netDailyMargin: number;
  specificEnergyCost: number;
  [key: string]: any;
}

export interface OptimizationResult {
  projectedNpvGain: number;
  projectedOilGainPercent: number;
  projectedSorReductionPercent: number;
  projectedEnergySavingsPercent: number;
  paybackDays: number;
  recommendedSteamVolume?: number;
  recommendedSoakDays?: number;
  recommendedCutoffRate?: number;
  iterations?: number;
  [key: string]: any;
}

export interface Recommendation {
  label: string;
  score: number;
  predicted_oil_rate_bopd: number;
  predicted_sor: number;
  predicted_failure_probability: number;
  parameters: Record<string, any>;
  [key: string]: any;
}

export type SrpTwinState = Record<string, any>;
export type ReservoirTwinState = Record<string, any>;
export type WellboreTwinState = Record<string, any>;

export type WorkOrderPriority = 'P1 - Immediate' | 'P2 - High' | 'P3 - Normal' | 'P4 - Low' | string;
export type WorkOrderStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled' | string;
