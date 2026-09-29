export const mockRodTaperAnalysis = [
  { section: 'Top', material: 'Steel', diameter: '1 inch', interval: '0-1000 ft', stressRatio: 0.5, peakStress: 100, yieldLimit: 200, statusColor: 'green', status: 'OK' }
];

export const mockDynoLoops = {
  current: { surface: [], downhole: [], label: '', fluidPoundPoint: [0,0] },
  previous: { surface: [], downhole: [], label: '', fluidPoundPoint: [0,0] },
  baseline: { surface: [], downhole: [], label: '', fluidPoundPoint: [0,0] }
};
