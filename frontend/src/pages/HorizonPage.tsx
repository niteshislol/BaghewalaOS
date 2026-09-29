import React, { useState } from 'react';
import { useWellStore } from '../stores/wellStore';
import { CalendarDays, Play, FastForward, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { simulateHorizon } from '../services/api';

export const HorizonPage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [horizonMonths, setHorizonMonths] = useState(6);
  const [simData, setSimData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);

  const runSimulation = async (optimized = false) => {
    setLoading(true);
    setIsOptimized(optimized);
    try {
      const result = await simulateHorizon(selectedWell, horizonMonths * 30, optimized);
      setSimData(result.points || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl ring-1 ring-blue-500/30">
          <LineChart className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Horizon Simulator</h1>
          <p className="text-slate-400 mt-1">Multi-variable time-series predictive forecasting · {selectedWell}</p>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-400" /> Simulation Timeframe
        </h2>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-1">
            <input 
              type="range" 
              min="1" 
              max="24" 
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
              <span>1 Month</span>
              <span>12 Months</span>
              <span>24 Months</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-white min-w-[120px] text-right">
            +{horizonMonths} <span className="text-sm font-normal text-slate-400 uppercase tracking-wider">Months</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => runSimulation(false)}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-5 h-5" /> {loading && !isOptimized ? 'Simulating...' : 'Run Standard Forecast'}
          </button>
          <button 
            onClick={() => runSimulation(true)}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-600 disabled:opacity-50"
          >
            <FastForward className="w-5 h-5" /> {loading && isOptimized ? 'Simulating...' : 'Accelerated Stress Test'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 min-h-[350px] flex flex-col">
          <h3 className="text-lg font-medium text-white mb-4">Production Trajectory (BOPD)</h3>
          {simData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-slate-500 mb-4"><Activity className="w-12 h-12 opacity-50" /></div>
              <p className="text-slate-400 text-sm text-center max-w-sm">Awaiting simulation run. This panel will visualize the forecasted daily oil rate.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={simData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="sim_day" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }} 
                  label={{ value: 'Simulation Day', position: 'insideBottom', offset: -15, fill: '#cbd5e1' }} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }} 
                  label={{ value: 'BOPD', angle: -90, position: 'insideLeft', offset: -5, fill: '#cbd5e1' }}
                />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                <Area type="monotone" dataKey="oil_rate_bopd" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Oil Rate (BOPD)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 min-h-[350px] flex flex-col">
          <h3 className="text-lg font-medium text-white mb-4">Reservoir Pressure Decline (bar)</h3>
          {simData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-slate-500 mb-4"><Activity className="w-12 h-12 opacity-50" /></div>
              <p className="text-slate-400 text-sm text-center max-w-sm">Awaiting simulation run. This panel will track expected bottom-hole pressure degradation over the {horizonMonths}-month horizon.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={simData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="sim_day" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }} 
                  label={{ value: 'Simulation Day', position: 'insideBottom', offset: -15, fill: '#cbd5e1' }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }} 
                  domain={['auto', 'auto']} 
                  label={{ value: 'Pressure (bar)', angle: -90, position: 'insideLeft', offset: -5, fill: '#cbd5e1' }}
                />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }} />
                <Line type="monotone" dataKey="pressure" stroke="#10b981" strokeWidth={2} name="Pressure (bar)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizonPage;
