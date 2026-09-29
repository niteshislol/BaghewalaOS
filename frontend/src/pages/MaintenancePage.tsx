import React, { useState, useEffect } from 'react';
import { useWellStore } from '../stores/wellStore';
import { Wrench, Settings, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { getMaintenance } from '../services/api';

export const MaintenancePage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        setIsLoading(true);
        const res = await getMaintenance(selectedWell);
        setData(res);
      } catch (err) {
        console.error("Failed to fetch maintenance data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMaintenance();
  }, [selectedWell]);

  const equipments = data ? [{
    name: 'FIELD EQUIPMENT / SRP',
    rul: `${Math.round(data.rul_days ?? 0)} days`,
    health: Math.round((Number(data.equipment_health ?? 0) * 100)),
    status: Number(data.equipment_health ?? 0) < 0.45 ? 'critical' : Number(data.equipment_health ?? 0) < 0.70 ? 'warning' : 'normal'
  }] : [];

  const interventions = (data?.recommendations || []).map((r: any) => ({
    timeframe_days: /immediate/i.test(r.when || '') ? 0 : (/7/.test(r.when || '') ? 7 : (/14/.test(r.when || '') ? 14 : 30)),
    action: r.what,
    reason: r.why
  }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl ring-1 ring-amber-500/30">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Predictive Maintenance</h1>
          <p className="text-slate-400 mt-1">Remaining Useful Life (RUL) & Failure Probability · {selectedWell}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" /> Equipment Health Monitoring
          </h2>
          {equipments.map((eq, i) => (
            <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium text-white">{eq.name}</h3>
                  {eq.status === 'critical' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">Action Required</span>}
                  {eq.status === 'warning' && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">Monitor</span>}
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 mt-3">
                  <div 
                    className={`h-full rounded-full ${eq.status === 'critical' ? 'bg-rose-500' : eq.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${eq.health}%` }} 
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-500">0%</span>
                  <span className="text-xs font-medium text-slate-400">Health: {eq.health}%</span>
                  <span className="text-xs text-slate-500">100%</span>
                </div>
              </div>
              <div className="flex items-center gap-6 md:px-6 md:border-l border-slate-700/50">
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Est. RUL</div>
                  <div className={`text-xl font-bold ${eq.status === 'critical' ? 'text-rose-400' : 'text-white'}`}>{eq.rul}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" /> Upcoming Interventions
          </h2>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <div className="relative border-l-2 border-slate-700 ml-3 space-y-6">
              
              {interventions.length > 0 ? interventions.map((inv: any, idx: number) => {
                const isUrgent = inv.timeframe_days <= 14;
                const isSoon = inv.timeframe_days > 14 && inv.timeframe_days <= 45;
                
                let colorClass = 'slate';
                if (isUrgent) colorClass = 'rose';
                else if (isSoon) colorClass = 'amber';

                const borderClass = isUrgent ? 'border-rose-500' : isSoon ? 'border-amber-500' : 'border-slate-500';
                const textClass = isUrgent ? 'text-rose-400' : isSoon ? 'text-amber-400' : 'text-slate-400';
                
                return (
                  <div key={idx} className="relative pl-6">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 ${borderClass}`} />
                    <div className={`text-xs font-bold ${textClass} uppercase tracking-wider mb-1`}>Within {inv.timeframe_days} Days</div>
                    <div className="font-medium text-white">{inv.action}</div>
                    <div className="text-sm text-slate-400 mt-1">{inv.reason}</div>
                  </div>
                );
              }) : (
                <div className="text-slate-500 text-sm italic pl-6">No immediate interventions required.</div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
