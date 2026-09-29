import type {
  CSSPhase,
  DynamometerCardData,
  DynamometerPoint,
  RealTimeTelemetry,
  ReservoirParameters,
  CSSParameters,
  SRPParameters,
} from '../types';

// Baseline Baghewala Field Constants
export const DEFAULT_RESERVOIR: ReservoirParameters = {
  apiGravity: 17.5,
  depth: 1100, // meters
  reservoirTemp: 47, // °C
  reservoirPressure: 35, // bar
  asphalteneContent: 14.5, // %
  initialViscosity: 3200, // cP at 47°C
  formationName: 'Jodhpur Sandstone',
};

export const DEFAULT_CSS: CSSParameters = {
  steamVolume: 2500, // m3 CWE
  injectionPressure: 85, // bar
  injectionTemp: 295, // °C
  soakTimeDays: 5,
  productionCutoffRate: 4.5, // m3/day
  cycleNumber: 3,
};

export const DEFAULT_SRP: SRPParameters = {
  strokeLength: 100, // inches
  spm: 6.0, // strokes/min
  plungerDiameter: 2.0, // inches
  rodDiameter: 0.875, // inches
  pumpDepth: 1050, // meters
};

/**
 * Calculates Crude Viscosity (cP) as a function of Temperature (°C) using Andrade Empirical Model
 * Calibrated specifically for Baghewala 17.5° API Crude (3200 cP at 47°C down to 18 cP at 260°C)
 */
export function calculateViscosity(temperatureC: number): number {
  const T_kelvin = temperatureC + 273.15;
  const T_ref = 47 + 273.15; // 320.15 K
  const mu_ref = 3200; // cP
  const B = 4650; // Activation energy / gas constant empirical coefficient for Baghewala heavy crude

  const mu = mu_ref * Math.exp(B * (1 / T_kelvin - 1 / T_ref));
  return Math.max(12, Math.min(8000, mu));
}

/**
 * Simulates bottom-hole temperature decay over CSS production phase days
 */
export function calculateBottomHoleTemp(
  dayInCycle: number,
  phase: CSSPhase,
  css: CSSParameters,
  res: ReservoirParameters
): number {
  if (phase === 'INJECTION') {
    const fraction = Math.min(1, dayInCycle / 10);
    return res.reservoirTemp + (css.injectionTemp - res.reservoirTemp) * fraction;
  }
  if (phase === 'SOAK') {
    return css.injectionTemp - dayInCycle * 3.5; // Slight cooling during soak
  }
  if (phase === 'PRODUCTION') {
    // Thermal decay exponent based on steam volume and production time
    const heatCapacityFactor = css.steamVolume / 2000;
    const decayRate = 0.045 / Math.sqrt(heatCapacityFactor);
    const peakTemp = css.injectionTemp - css.soakTimeDays * 3.5;
    const temp = res.reservoirTemp + (peakTemp - res.reservoirTemp) * Math.exp(-decayRate * dayInCycle);
    return Math.max(res.reservoirTemp, temp);
  }
  return res.reservoirTemp;
}

/**
 * Calculates Oil Production Rate (m3/day) based on Viscosity & Pump Speed
 */
export function calculateProductionRates(
  viscositycP: number,
  srp: SRPParameters,
  pumpFillage: number = 0.85
): { oilRate: number; waterRate: number; waterCut: number } {
  // Pump Displacement Rate (m3/day theoretical)
  // Area = pi/4 * d^2 (in2) -> converted to m3/stroke
  const plungerAreaM2 = (Math.PI / 4) * Math.pow(srp.plungerDiameter * 0.0254, 2);
  const strokeMeters = srp.strokeLength * 0.0254;
  const theoreticalDisplacementM3PerDay = plungerAreaM2 * strokeMeters * srp.spm * 60 * 24;

  // Mobility factor based on viscosity (relative to 100 cP baseline)
  const mobilityRatio = Math.pow(100 / viscositycP, 0.45);
  const inflowCapacity = theoreticalDisplacementM3PerDay * Math.min(1.2, mobilityRatio * 0.95);

  const actualTotalRate = Math.min(theoreticalDisplacementM3PerDay * pumpFillage, inflowCapacity);

  // Water cut starts high after steam injection (condensate), then stabilizes
  const baseWaterCut = Math.min(82, 35 + (viscositycP / 3200) * 20);
  const waterCutFraction = baseWaterCut / 100;

  const oilRate = actualTotalRate * (1 - waterCutFraction);
  const waterRate = actualTotalRate * waterCutFraction;

  return {
    oilRate: Math.max(0.5, parseFloat(oilRate.toFixed(2))),
    waterRate: Math.max(0.5, parseFloat(waterRate.toFixed(2))),
    waterCut: parseFloat(baseWaterCut.toFixed(1)),
  };
}

/**
 * Calculates Polished Rod Loads & Rod Floating Risk Score
 */
export function calculateRodLoadsAndFloatingRisk(
  viscositycP: number,
  srp: SRPParameters
): {
  peakLoadLbs: number;
  minLoadLbs: number;
  floatingRiskScore: number;
  isRodFloating: boolean;
  viscousDragDownstageLbs: number;
} {
  // Rod String Weight in air (7/8" steel rod = ~2.22 lbs/ft)
  const depthFt = srp.pumpDepth * 3.28084;
  const rodWeightAir = 2.22 * depthFt; // ~8000 lbs
  const buoyantWeight = rodWeightAir * (1 - 0.85 / 7.85); // ~7100 lbs in crude

  // Fluid Load on Plunger
  const plungerAreaIn2 = (Math.PI / 4) * Math.pow(srp.plungerDiameter, 2);
  const fluidHeadPsi = depthFt * 0.42; // ~1500 psi
  const fluidLoad = plungerAreaIn2 * fluidHeadPsi; // ~4700 lbs

  // Acceleration factor (SPM^2 * Stroke / 70500)
  const accelerationFactor = (Math.pow(srp.spm, 2) * srp.strokeLength) / 70500;
  const inertiaLoad = buoyantWeight * accelerationFactor;

  // Viscous Drag on Rod String (proportional to viscosity and velocity v = SPM * Stroke)
  const rodSpeedFtPerSec = (2 * srp.strokeLength * srp.spm) / (12 * 60);
  const viscousDragLbs = 1.8 * Math.pow(viscositycP, 0.65) * rodSpeedFtPerSec;

  // Peak Surface Load (Upstroke)
  const peakLoadLbs = buoyantWeight + fluidLoad + inertiaLoad + viscousDragLbs;

  // Minimum Surface Load (Downstroke) -> Gravity pulling down minus Inertia & Viscous Drag upwards
  const minLoadLbs = buoyantWeight - inertiaLoad - viscousDragLbs;

  // Rod Floating condition: when viscous drag + downstroke inertia > buoyant weight, net tension drops to 0 or negative
  const netDownstrokeTensionMargin = buoyantWeight - (inertiaLoad + viscousDragLbs);

  let floatingRiskScore = 0;
  if (netDownstrokeTensionMargin < 1500) {
    floatingRiskScore = Math.min(100, Math.round(((1500 - netDownstrokeTensionMargin) / 1800) * 100));
  }

  const isRodFloating = floatingRiskScore >= 65 || minLoadLbs < 800;

  return {
    peakLoadLbs: Math.round(peakLoadLbs),
    minLoadLbs: Math.round(Math.max(0, minLoadLbs)),
    floatingRiskScore: Math.min(100, Math.max(0, floatingRiskScore)),
    isRodFloating,
    viscousDragDownstageLbs: Math.round(viscousDragLbs),
  };
}

/**
 * Generates Dynamometer Card Points (Surface & Downhole Load vs Position)
 */
export function generateDynamometerCard(
  viscositycP: number,
  srp: SRPParameters,
  forcedAnomaly?: 'NORMAL' | 'ROD_FLOATING' | 'FLUID_POUND' | 'GAS_INTERFERENCE' | 'LEAKAGE'
): DynamometerCardData {
  const pointsCount = 60;
  const surfacePoints: DynamometerPoint[] = [];
  const downholePoints: DynamometerPoint[] = [];
  const stroke = srp.strokeLength;

  const loads = calculateRodLoadsAndFloatingRisk(viscositycP, srp);
  const peak = loads.peakLoadLbs;
  const min = loads.minLoadLbs;

  let anomaly = forcedAnomaly;
  if (!anomaly) {
    if (loads.isRodFloating) {
      anomaly = 'ROD_FLOATING';
    } else if (srp.spm > 7.5 && viscositycP > 800) {
      anomaly = 'FLUID_POUND';
    } else {
      anomaly = 'NORMAL';
    }
  }

  // Upstroke (0 to stroke) and Downstroke (stroke to 0)
  for (let i = 0; i <= pointsCount; i++) {
    const t = (i / pointsCount) * 2 * Math.PI; // angle 0 to 2pi
    // Simple Harmonic Motion for position
    const position = (stroke / 2) * (1 - Math.cos(t));
    const isUpstroke = Math.sin(t) >= 0;

    let surfaceLoad = 0;
    let downholeLoad = 0;

    if (anomaly === 'NORMAL') {
      if (isUpstroke) {
        // Stretch & Load pickup
        const stretchPhase = Math.min(1, position / 15);
        surfaceLoad = min + (peak - min) * Math.sin(stretchPhase * (Math.PI / 2));
        downholeLoad = 4500 + 300 * Math.sin(t);
      } else {
        // Downstroke load release
        const releasePhase = Math.min(1, (stroke - position) / 15);
        surfaceLoad = peak - (peak - min) * Math.sin(releasePhase * (Math.PI / 2));
        downholeLoad = 800 + 200 * Math.cos(t);
      }
    } else if (anomaly === 'ROD_FLOATING') {
      // Rod floating creates a bottom loop compression load drop on downstroke
      if (isUpstroke) {
        surfaceLoad = min + (peak - min) * (position / stroke);
        downholeLoad = 4200;
      } else {
        // Compression / slack line on downstroke
        const floatDrop = Math.pow((stroke - position) / stroke, 1.5) * (peak - 400);
        surfaceLoad = Math.max(100, peak - floatDrop);
        downholeLoad = 200;
      }
    } else if (anomaly === 'FLUID_POUND') {
      if (isUpstroke) {
        surfaceLoad = min + (peak - min) * (position / stroke);
        downholeLoad = 4500;
      } else {
        // Sudden drop mid downstroke when traveling valve hits liquid level
        const midPoint = stroke * 0.45;
        if (position > midPoint) {
          surfaceLoad = peak * 0.85;
        } else {
          surfaceLoad = min + 500 * Math.random();
        }
        downholeLoad = 600;
      }
    } else {
      // General fallback / Gas Interference
      surfaceLoad = min + (peak - min) * Math.pow(position / stroke, 0.7);
      downholeLoad = 3500;
    }

    surfacePoints.push({
      position: parseFloat(position.toFixed(1)),
      surfaceLoad: Math.round(surfaceLoad),
      downholeLoad: Math.round(downholeLoad),
    });
  }

  let cardDescription = 'Optimal operation with balanced valve timing and full fluid fillage.';
  if (anomaly === 'ROD_FLOATING') {
    cardDescription = `CRITICAL: Severe viscous drag detected (${viscositycP.toFixed(0)} cP). Rod string is floating on downstroke. Reduce SPM immediately or schedule thermal hot flush.`;
  } else if (anomaly === 'FLUID_POUND') {
    cardDescription = 'WARNING: Fluid pound detected due to low pump fillage. Pump displacement exceeds inflow rate. Reduce SPM to allow reservoir fill.';
  } else if (anomaly === 'GAS_INTERFERENCE') {
    cardDescription = 'WARNING: Gas compression delaying traveling valve opening. Recommend gas anchor inspection or SPM adjustment.';
  }

  return {
    surfacePoints,
    downholePoints,
    anomalyType: anomaly,
    confidence: anomaly === 'NORMAL' ? 98 : 92,
    cardDescription,
  };
}

/**
 * Generates synthetic telemetry state given current day in CSS production phase
 */
export function generateTelemetryForDay(
  dayInCycle: number,
  css: CSSParameters = DEFAULT_CSS,
  srp: SRPParameters = DEFAULT_SRP,
  res: ReservoirParameters = DEFAULT_RESERVOIR
): RealTimeTelemetry {
  const phase: CSSPhase = dayInCycle <= 0 ? 'INJECTION' : 'PRODUCTION';

  const bht = calculateBottomHoleTemp(dayInCycle, phase, css, res);
  const viscosity = calculateViscosity(bht);
  const rates = calculateProductionRates(viscosity, srp);
  const loads = calculateRodLoadsAndFloatingRisk(viscosity, srp);

  // Steam-Oil Ratio calculation (cumulative steam volume / cumulative oil m3)
  const approxCumOil = Math.max(1, rates.oilRate * dayInCycle * 0.85);
  const sor = parseFloat((css.steamVolume / approxCumOil).toFixed(2));

  // Economic calculation
  const oilPriceBbl = 72; // USD/bbl
  const bblsPerM3 = 6.28981;
  const dailyOilBbls = rates.oilRate * bblsPerM3;
  const grossRevenue = dailyOilBbls * oilPriceBbl;

  // Power & Steam fuel cost
  const spmKw = 0.8 * srp.spm * 24; // kWh per day
  const powerCost = spmKw * 0.12; // $0.12/kWh
  const steamFuelAmortizedPerDay = (css.steamVolume * 14.5) / 60; // $14.5/m3 steam amortized over 60 days
  const netDailyMargin = Math.round(grossRevenue - powerCost - steamFuelAmortizedPerDay);

  const specificEnergyCost = parseFloat(((powerCost + steamFuelAmortizedPerDay) / Math.max(1, dailyOilBbls)).toFixed(2));

  return {
    timestamp: Date.now(),
    isoTime: new Date().toISOString().substring(11, 23),
    cycleDays: dayInCycle,
    phase,
    bottomHoleTemp: parseFloat(bht.toFixed(1)),
    viscosity: parseFloat(viscosity.toFixed(0)),
    fluidTemperature: parseFloat((bht * 0.65).toFixed(1)),
    oilRate: rates.oilRate,
    waterRate: rates.waterRate,
    waterCut: rates.waterCut,
    steamInjectionRate: phase === 'INJECTION' ? 450 : 0,
    spm: srp.spm,
    instantaneousRodPosition: parseFloat(((srp.strokeLength / 2) * (1 - Math.cos(0))).toFixed(1)),
    instantaneousRodLoad: loads.peakLoadLbs,
    polishedRodPeakLoad: loads.peakLoadLbs,
    polishedRodMinLoad: loads.minLoadLbs,
    motorPowerKw: parseFloat((Math.max(1.8, (loads.peakLoadLbs * srp.strokeLength * srp.spm * 0.7457) / (12 * 33000 * 0.88) + 0.9)).toFixed(2)),
    motorCurrentAmps: 18.5,
    casingPressureBar: 14.7,
    tubingHeadPressureBar: 23.5,
    downholePressureBar: 108.2,
    acousticFluidLevelMeters: Math.round(res.depth - 220),
    vibrationRmsMmSec: 1.8,
    rodFloatingRiskScore: loads.floatingRiskScore,
    rodFloatingDetected: loads.isRodFloating,
    pumpFillagePercent: parseFloat((Math.min(96, 98 - (loads.floatingRiskScore / 100) * 35)).toFixed(1)),
    steamOilRatio: Math.min(15, sor),
    specificEnergyCost,
    netDailyMargin,
    samplingRateMs: 250,
    packetsReceived: 1000,
    commLatencyMs: 14,
    mqttStatus: 'CONNECTED',
  };
}
