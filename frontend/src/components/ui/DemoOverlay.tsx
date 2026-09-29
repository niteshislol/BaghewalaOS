import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemoStore, TOUR_STEPS } from '../../stores/useDemoStore';
import { ChevronRight, X, Play } from 'lucide-react';

export const DemoOverlay: React.FC = () => {
  const { isActive, currentStep, nextStep, endDemo } = useDemoStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isActive && TOUR_STEPS[currentStep]) {
      // Navigate to the current step's path if we are not already there
      if (location.pathname !== TOUR_STEPS[currentStep].path) {
        navigate(TOUR_STEPS[currentStep].path);
      }
    }
  }, [isActive, currentStep, navigate, location.pathname]);

  if (!isActive) return null;

  const stepData = TOUR_STEPS[currentStep];

  return (
    <div className="fixed bottom-8 right-8 z-[9999] w-96 bg-slate-900/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
      <div className="bg-emerald-500/20 px-4 py-3 flex items-center justify-between border-b border-emerald-500/30">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <Play className="w-4 h-4" />
          <span>Interactive Tour</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-500/80 bg-emerald-500/10 px-2 py-1 rounded-full">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
          <button 
            onClick={endDemo}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-2">{stepData.title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed mb-6">
          {stepData.message}
        </p>
        
        <div className="flex justify-between items-center">
          <button
            onClick={endDemo}
            className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            End Tour
          </button>
          
          <button
            onClick={nextStep}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 px-5 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
          >
            {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next Page'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
