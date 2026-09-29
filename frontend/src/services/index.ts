import { getTwin } from './api';

export const digitalTwinService = {
  getSrpTwin: async (wellId = 'BGW-01') => {
    const twin = await getTwin(wellId);
    return {
      ...(twin.srp || {}),
      css_cycle_id: twin.css_cycle_id,
      cycle_day: twin.cycle_day,
      production_rate_bopd: twin.production_rate_bopd,
      reservoir_temperature_c: twin.reservoir_temperature,
      pressure_bar: twin.pressure,
      rod_float_risk: twin.rod_float_risk,
      failure_probability: twin.failure_probability,
      equipment_health: twin.equipment_health,
      srp_ml: twin.srp_ml,
      simulation_mode: twin.simulation_mode,
      demo_disclaimer: twin.demo_disclaimer,
    };
  },
  getReservoirTwin: async (wellId = 'BGW-01') => {
    const twin = await getTwin(wellId);
    return {
      temperature_c: twin.reservoir_temperature,
      pressure_kpa: twin.pressure,
      in_situ_viscosity_cp: twin.in_situ_viscosity,
      heated_radius_m: twin.heated_radius_m,
    };
  },
  getWellboreTwin: async (wellId = 'BGW-01') => {
    const twin = await getTwin(wellId);
    return {
      phase: twin.phase,
      production_rate_bopd: twin.production_rate_bopd,
      sor: twin.sor,
      cumulative_oil_bbl: twin.cumulative_production,
    };
  },
};

export const cssCycleService = {
  getCurrentCycle: async (wellId = 'BGW-01') => {
    const twin = await getTwin(wellId);
    return {
      css_cycle_id: twin.css_cycle_id,
      cycle_day: twin.cycle_day,
      steam_injected_m3: twin.steam_injected,
    };
  },
  getCssCycle: async (wellId = 'BGW-01') => cssCycleService.getCurrentCycle(wellId),
};
