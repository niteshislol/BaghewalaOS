export const mockAiInsight = {
  horizons: {
    '24h': {
      label: '24 Hours',
      expectedProduction: 182.1,
      confidenceInterval: [178.5, 185.7],
      confidence: 94,
      trend: 'down',
      keyRisk: 'Viscosity increasing by 3.2% per day, impending pump strain.'
    },
    '72h': {
      label: '72 Hours',
      expectedProduction: 175.4,
      confidenceInterval: [165.0, 180.2],
      confidence: 88,
      trend: 'down',
      keyRisk: 'Fillage predicted to drop below 75% due to viscous inflow resistance.'
    },
    '7d': {
      label: '7 Days',
      expectedProduction: 160.5,
      confidenceInterval: [145.0, 172.5],
      confidence: 76,
      trend: 'down',
      keyRisk: 'Risk of complete fluid pound if SPM is not reduced to match inflow.'
    },
    '90d': {
      label: '90 Days (Cycle End)',
      expectedProduction: 45.0,
      confidenceInterval: [30.0, 60.0],
      confidence: 45,
      trend: 'flat',
      keyRisk: 'Uneconomic rate. Cycle termination recommended.'
    }
  },
  featureImportance: [
    { feature: 'Reservoir Cooling', value: 0.85, type: 'negative' },
    { feature: 'Fluid Viscosity', value: 0.72, type: 'negative' },
    { feature: 'Pump SPM', value: 0.45, type: 'positive' },
    { feature: 'Gas Interference', value: 0.22, type: 'negative' },
    { feature: 'Water Cut', value: 0.15, type: 'neutral' }
  ]
};