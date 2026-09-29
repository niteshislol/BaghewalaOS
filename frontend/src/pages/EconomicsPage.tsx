import React, { useEffect, useState } from 'react';
import { useWellStore } from '../stores/wellStore';
import { DollarSign, TrendingUp, TrendingDown, Wallet, LineChart as LucideLineChart } from 'lucide-react';
import { getTwin } from '../services/api';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export const EconomicsPage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [twin, setTwin] = useState<any>(null);

  useEffect(() => {
    getTwin(selectedWell).then(setTwin).catch(console.error);
  }, [selectedWell]);

  const productionBopd = twin?.production_rate_bopd || 0;
  const powerKw = twin?.motor_power_kw || 0;
  const equipmentHealth = twin?.equipment_health || 1.0;
  
  const oilPrice = 75.0; // USD/bbl
  const powerCost = 0.12; // USD/kWh
  const days = 30;
  
  const projectedRevenue = productionBopd * days * oilPrice;
  const opexElec = powerKw * 24 * days * powerCost;
  const opexMaint = 150 * days * (1.5 - equipmentHealth);
  const currentOpex = opexElec + opexMaint + 4000; // adding base fixed cost
  
  const liftingCost = productionBopd > 0 ? currentOpex / (productionBopd * days) : 0;
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const projectionData = Array.from({ length: 12 }).map((_, i) => {
    // slight decline curve for revenue
    const decline = Math.pow(0.98, i);
    const mRev = projectedRevenue * decline;
    const mOpex = currentOpex * (1 + i * 0.01); // OPEX goes up slightly over time
    return {
      month: `Month ${i + 1}`,
      Revenue: Math.round(mRev),
      OPEX: Math.round(mOpex),
      NetProfit: Math.round(mRev - mOpex)
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl ring-1 ring-emerald-500/30">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Economics & ROI Tracker</h1>
          <p className="text-slate-400 mt-1">Live OPEX/CAPEX forecasting and optimization value tracking · {selectedWell}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="text-sm text-slate-400 font-medium flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-emerald-400" /> Projected Revenue (Monthly)</div>
          <div className="text-3xl font-bold text-white">{formatter.format(projectedRevenue)}</div>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-emerald-400">
            <TrendingUp className="w-3 h-3" /> Live projection based on {productionBopd.toFixed(1)} BOPD
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="text-sm text-slate-400 font-medium flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-rose-400" /> Current OPEX (Monthly)</div>
          <div className="text-3xl font-bold text-white">{formatter.format(currentOpex)}</div>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-emerald-400">
            <TrendingDown className="w-3 h-3" /> Includes energy and wear factor
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="text-sm text-slate-400 font-medium flex items-center gap-2 mb-2"><LucideLineChart className="w-4 h-4 text-blue-400" /> Lifting Cost</div>
          <div className="text-3xl font-bold text-white">${liftingCost.toFixed(2)}<span className="text-lg font-normal text-slate-500"> / bbl</span></div>
          <div className="flex items-center gap-2 mt-2 text-xs font-medium text-blue-400">
            Target: {"<$15.00/bbl"}
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden bg-gradient-to-br from-indigo-900/40 to-slate-900/40">
          <div className="text-sm text-indigo-300 font-medium mb-2 uppercase tracking-wider">AI Value Generated (YTD)</div>
          <div className="text-3xl font-bold text-white">$1.24M</div>
          <div className="mt-2 text-xs text-indigo-200/70">From avoided downtime & optimized steam injection</div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 flex flex-col">
        <h3 className="text-xl font-medium text-white mb-2">12-Month Cash Flow Projections</h3>
        <p className="text-slate-400 text-sm max-w-2xl mb-6">Financial time-series predicting Revenue, OPEX, and Net Profit. Accounting for {productionBopd > 0 ? 'a 2% monthly production decline' : 'static operations'} and 1% monthly OPEX inflation.</p>
        
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val/1000}k`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569' }}
              formatter={(value: number) => formatter.format(value)}
            />
            <Legend />
            <Bar dataKey="Revenue" fill="#10b981" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            <Bar dataKey="OPEX" fill="#f43f5e" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="NetProfit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EconomicsPage;
