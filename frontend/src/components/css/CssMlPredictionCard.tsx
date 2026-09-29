import React from 'react';
import { Flame, BrainCircuit, Activity, Droplets } from 'lucide-react';

interface CssMlPredictionCardProps {
  cycle?: any;
  title?: string;
  subtitle?: string;
}

export const CssMlPredictionCard: React.FC<CssMlPredictionCardProps> = ({
  cycle,
  title = "CSS Thermal Surrogate Predictor",
  subtitle = "Machine learning forecast for thermodynamic OSR cutoff"
}) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 relative overflow-hidden mb-6">
      {/* Decorative gradient orb */}
      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-lg ring-1 ring-orange-500/30">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">CatBoost Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Prediction 1 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emerald-400" /> Est. Bitumen
            </span>
          </div>
          <div className="text-2xl font-bold text-white">425 <span className="text-sm font-normal text-slate-400">bbl/d</span></div>
          <div className="text-xs text-emerald-400/80 mt-1">+12% vs Baseline</div>
        </div>

        {/* Prediction 2 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> Steam Quality
            </span>
          </div>
          <div className="text-2xl font-bold text-white">82.5%</div>
          <div className="text-xs text-slate-500 mt-1">Optimal thermodynamic range</div>
        </div>
        
        {/* Prediction 3 */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Model Confidence & OSR</span>
          </div>
          <div className="flex items-end gap-4 mt-2">
            <div>
              <div className="text-2xl font-bold text-indigo-400">0.45</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Projected OSR</div>
            </div>
            <div className="flex-1 bg-slate-900 rounded-full h-2 mb-2 border border-slate-800">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full" style={{ width: '85%' }}></div>
            </div>
            <div className="text-sm font-medium text-slate-300 mb-0.5">85%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CssMlPredictionCard;
