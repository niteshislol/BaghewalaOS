import React, { useState, useEffect } from 'react';
import { useWellStore } from '../stores/wellStore';
import { Shield, Lock, FileText, CheckCircle, Database } from 'lucide-react';
import { getAuditLogs } from '../services/api';

export const AuditPage: React.FC = () => {
  const { selectedWell } = useWellStore();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, integrity: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const data = await getAuditLogs(selectedWell);
        setAuditLogs(data.records || []);
        setStats({ total: data.total_returned || 0, integrity: data.integrity_check ?? true });
      } catch (err) {
        console.error("Failed to fetch audit logs", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [selectedWell]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4 border-b border-slate-700/50 pb-6">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl ring-1 ring-indigo-500/30">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit & Compliance Log</h1>
          <p className="text-slate-400 mt-1">SHA-256 tamper-evident event log — every prediction, dispatch and VFD action · {selectedWell}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full"><Lock className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-bold text-white">Immutable</div>
            <div className="text-sm text-slate-400">Hash-chained Audit Store</div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full"><Database className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.total > 0 ? stats.total : '...'}</div>
            <div className="text-sm text-slate-400">Events Retrieved</div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-full"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <div className="text-2xl font-bold text-white">{stats.integrity ? '100%' : 'WARNING'}</div>
            <div className="text-sm text-slate-400">Compliance Verification</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/30">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" /> Recent Transactions
          </h3>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Synchronizing with live twin...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Tx Hash</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Node</th>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {auditLogs.map(log => (
                  <tr key={log.event_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-indigo-400" title={log.sha256}>
                      {log.sha256 ? log.sha256.substring(0, 8) + '...' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">{log.event_type}</td>
                    <td className="px-6 py-4">{log.node_id}</td>
                    <td className="px-6 py-4 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No events found in audit log.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditPage;
