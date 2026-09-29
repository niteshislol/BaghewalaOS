import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Clock, ChevronDown, ChevronUp, Check, RefreshCw, Gauge, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../components/ui/SectionHeader';
import { SeverityBadge } from '../components/ui/SeverityBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useAlertStore } from '../stores/useAlertStore';
import { useAiCopilot } from '../features/ai-copilot/hooks/useAiCopilot';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    alerts,
    filterSeverity,
    filterStatus,
    isLoading,
    loadAlerts,
    setFilterSeverity,
    setFilterStatus,
    acknowledgeAlert,
    resolveAlert,
  } = useAlertStore();
  const { openWithPrompt } = useAiCopilot();

  const [expandedAlerts, setExpandedAlerts] = useState<Record<string, boolean>>({
    'ALM-4415': true,
    'ALM-4412': true,
  });

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const toggleExpand = (id: string) => {
    setExpandedAlerts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchSev = filterSeverity === 'all' || a.severity === filterSeverity;
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSev && matchStatus;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning' && a.status === 'active').length;
  const ackedCount = alerts.filter((a) => a.status === 'acknowledged').length;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Active Operational Alerts & Diagnostic Triage"
        subtitle="Automated physics-informed threshold detectors and SCADA alarm correlation triage for Well BW-017."
        badge={`${activeCount} Active Alarms`}
        badgeType={criticalCount > 0 ? 'red' : 'amber'}
      />

      {/* Filter Tabs & Counters */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-muted uppercase mr-1">Severity:</span>
          <button
            type="button"
            onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              filterSeverity === 'all'
                ? 'bg-surface text-ink border-petroleum shadow-sm'
                : 'bg-surface-secondary text-ink-secondary border-border hover:text-ink'
            }`}
          >
            All Severities ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('critical')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              filterSeverity === 'critical'
                ? 'bg-status-crit text-white border-status-crit shadow-sm'
                : 'bg-surface-secondary text-status-crit border-border hover:bg-status-crit-bg'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-status-crit" />
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('warning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              filterSeverity === 'warning'
                ? 'bg-status-warn text-white border-status-warn shadow-sm'
                : 'bg-surface-secondary text-status-warn border-border hover:bg-status-warn-bg'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-status-warn" />
            Warning ({warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              filterSeverity === 'info'
                ? 'bg-status-info text-white border-status-info shadow-sm'
                : 'bg-surface-secondary text-status-info border-border hover:bg-status-info-bg'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-status-info" />
            Info
          </button>
        </div>

        {/* Status Switcher (Active, Acknowledged, Resolved) */}
        <div className="inline-flex rounded-lg border border-border bg-surface-secondary p-0.5 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filterStatus === 'active' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('acknowledged')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filterStatus === 'acknowledged' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            Acknowledged ({ackedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              filterStatus === 'all' ? 'bg-surface text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            All Logs
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No alerts in this view"
          description="All operational alarms matching the chosen filter are cleared or acknowledged."
        />
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isExpanded = !!expandedAlerts[alert.id];
            const isCritical = alert.severity === 'critical';
            const isAcked = alert.status === 'acknowledged';
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                className={`bg-surface border rounded-xl overflow-hidden transition-all shadow-subtle ${
                  isCritical && !isAcked
                    ? 'border-status-crit/40 border-l-4 border-l-status-crit'
                    : alert.severity === 'warning' && !isAcked
                    ? 'border-status-warn/40 border-l-4 border-l-status-warn'
                    : 'border-border border-l-4 border-l-border-dark'
                } ${isAcked || isResolved ? 'opacity-85' : ''}`}
              >
                {/* Alert Card Header */}
                <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5">
                      <SeverityBadge severity={alert.severity} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-ink-muted">
                          {alert.id}
                        </span>
                        <span className="text-xs text-ink-muted">·</span>
                        <span className="text-xs text-ink-secondary font-semibold uppercase">
                          {alert.subsystem}
                        </span>
                        <span className="text-xs text-ink-muted">·</span>
                        <span className="text-xs text-ink-muted flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {alert.timestamp}
                        </span>
                        <DataProvenanceBadge type="OBSERVED" size="sm" />
                      </div>

                      <h2 className="font-heading text-base font-semibold text-ink mt-1.5">
                        {alert.title}
                      </h2>

                      {/* Structured Hierarchy Summary Bar */}
                      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs bg-surface-secondary p-2.5 rounded-lg border border-border-subtle">
                        <div>
                          <span className="text-[9.5px] uppercase font-semibold text-ink-muted block font-sans">Current Value</span>
                          <span className="font-bold text-status-crit text-sm">
                            {alert.observedValue || alert.evidence[0]?.value || 'Abnormal'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9.5px] uppercase font-semibold text-ink-muted block font-sans">Expected Range</span>
                          <span className="font-semibold text-status-green">
                            {alert.threshold || 'Baseline Envelope'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <span className="text-[9.5px] uppercase font-semibold text-ink-muted block font-sans">Primary Impact</span>
                          <span className="text-ink font-sans text-xs truncate block">
                            {alert.id === 'ALM-4415'
                              ? 'Critical Rod String Parting Risk & Fatigue Acceleration'
                              : alert.id === 'ALM-4412'
                              ? 'Potential Net Oil Deficit & Downhole Shock Waves'
                              : 'Subsystem Drift & Operating Margin Softening'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-ink-secondary mt-2 max-w-3xl leading-relaxed">
                        {alert.what}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                    <button
                      type="button"
                      onClick={() =>
                        openWithPrompt(
                          `Investigate alert ${alert.id}: ${alert.title}. What is the root cause across the 4 twins and what immediate mitigation is recommended?`
                        )
                      }
                      className="h-8 px-2.5 rounded-lg bg-surface border border-petroleum/30 text-petroleum hover:bg-petroleum/10 dark:text-cyan-400 dark:border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Investigate with AI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-petroleum dark:text-cyan-400" />
                      <span className="hidden sm:inline">Investigate with AI</span>
                    </button>

                    {!isAcked && !isResolved && (
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="h-8 px-3 rounded-lg bg-surface border border-petroleum text-petroleum hover:bg-petroleum-tint text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        type="button"
                        onClick={() => resolveAlert(alert.id)}
                        className="h-8 px-3 rounded-lg bg-petroleum hover:bg-petroleum-hover text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleExpand(alert.id)}
                      className="h-8 w-8 rounded-lg border border-border bg-surface hover:bg-surface-secondary text-ink-muted flex items-center justify-center transition-colors"
                      aria-label="Toggle Details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Engineering Triage Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-border-subtle bg-surface-secondary/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                      <div>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                          Operational Impact & Physics Mechanism
                        </span>
                        <p className="text-xs text-ink leading-relaxed">
                          {alert.why}
                        </p>

                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted block mt-4 mb-1">
                          Recommended Action Protocol
                        </span>
                        <div className="p-3 bg-surface rounded-lg border border-border-subtle flex items-center justify-between gap-2">
                          <p className="text-xs text-ink font-medium leading-relaxed">
                            {alert.action}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                openWithPrompt(
                                  `Investigate alert ${alert.id}: ${alert.title}. Detail the operational impact: "${alert.why}", and explain step-by-step how to execute the recommended mitigation.`
                                )
                              }
                              className="h-7 px-2 rounded bg-surface border border-petroleum/30 text-petroleum hover:bg-petroleum/10 dark:text-cyan-400 dark:border-cyan-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-petroleum dark:text-cyan-400" />
                              <span>AI Deep-Dive</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate('/recommendations')}
                              className="h-7 px-2.5 rounded bg-petroleum text-white text-xs font-semibold shrink-0 hover:bg-petroleum-hover transition-colors"
                            >
                              Execute
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted block mb-1.5">
                          Sensor Telemetry Evidence
                        </span>
                        <div className="space-y-1.5 font-mono text-xs">
                          {alert.evidence.map((ev, i) => (
                            <div
                              key={i}
                              className="p-2 bg-surface rounded border border-border-subtle flex justify-between items-center"
                            >
                              <span className="text-ink-secondary font-sans text-xs">{ev.label}</span>
                              <span className="font-semibold text-ink">{ev.value}</span>
                            </div>
                          ))}
                        </div>

                        {alert.acknowledgedAt && (
                          <div className="mt-3 text-[11px] text-ink-muted flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-status-green" />
                            <span>Acknowledged at {alert.acknowledgedAt} by {alert.acknowledgedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default AlertsPage;
