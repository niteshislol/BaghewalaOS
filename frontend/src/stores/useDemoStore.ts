import { create } from 'zustand';

export type DemoStep = {
  path: string;
  title: string;
  message: string;
};

export const TOUR_STEPS: DemoStep[] = [
  { path: '/reservoir', title: 'Reservoir Twin', message: 'Monitor subsurface heat spread, viscosity, and real-time geology to optimize steam injection.' },
  { path: '/wellbore', title: 'Wellbore & Hydraulics', message: 'Track multiphase flow, phase changes, and pressure gradients from the bottom-hole to the surface.' },
  { path: '/srp', title: 'Surface Equipment (SRP)', message: 'Analyze rod stress, fatigue, and pump efficiency to detect early mechanical failures.' },
  { path: '/visualizer', title: 'Live SCADA Visualizer', message: 'Experience the real-time kinematic motion and thermal SCADA of the pump, mathematically synced to the twin engine.' },
  { path: '/alerts', title: 'Intelligent Alerts', message: 'Review AI-generated diagnostics and prioritized alerts for the entire well system.' },
  { path: '/horizon', title: 'Horizon Simulator', message: 'Forecast future production crashes and pressure drops over time using the predictive digital twin.' },
  { path: '/whatif', title: 'What-If Sandbox', message: 'Safely test parameter changes (like SPM or steam volume) in a sandbox without affecting the real well.' },
  { path: '/ai', title: 'AI Advisor', message: 'Chat with our LLM trained on field manuals and live sensor data to get instant operational guidance.' },
  { path: '/economics', title: 'Economics & ROI', message: 'Track real-time OPEX, lifting costs, and 12-month cash flow projections.' },
  { path: '/maintenance', title: 'Predictive Maintenance', message: 'Monitor equipment health and remaining useful life (RUL) to plan interventions proactively.' },
  { path: '/work-orders', title: 'Work Orders', message: 'Manage and dispatch maintenance teams based on predictive alerts.' },
];

interface DemoState {
  isActive: boolean;
  currentStep: number;
  startDemo: () => void;
  nextStep: () => void;
  endDemo: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isActive: false,
  currentStep: 0,
  startDemo: () => set({ isActive: true, currentStep: 0 }),
  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < TOUR_STEPS.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else {
      set({ isActive: false, currentStep: 0 }); // end if last step
    }
  },
  endDemo: () => set({ isActive: false, currentStep: 0 })
}));
