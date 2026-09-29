import { useCallback, useState } from 'react';

type Alert = {
  id: string;
  what: string;
  why: string;
  action: string;
  evidence: { label: string; value: string }[];
  title: string;
  severity: string;
  status: 'active' | 'acknowledged';
  timestamp: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
};

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'ALRT-9012', what: 'Fluid Pound Detected',
    why: 'Incomplete pump fillage leading to sudden dynamic impact on downstroke.',
    action: 'Decrease pumping speed (SPM) or increase cycle off-time to allow wellbore fluid to recover.',
    evidence: [{ label: 'Surface Dynamometer', value: 'Plummet at 2.80m downstroke' }, { label: 'Calculated Fillage', value: '84.6%' }],
    title: 'SRP Fluid Pound', severity: 'critical', status: 'active', timestamp: new Date().toISOString(), acknowledgedAt: null, acknowledgedBy: null
  },
  {
    id: 'ALRT-9013', what: 'Sub-Optimal Steam Quality',
    why: 'Thermodynamic OSR is falling below the economic cutoff of 0.45.',
    action: 'Increase boiler feedwater temperature and tune generator fuel/air ratio.',
    evidence: [{ label: 'Current Steam Quality', value: '82.5%' }, { label: 'Target', value: '> 85%' }],
    title: 'CSS Steam Quality Drop', severity: 'warning', status: 'active', timestamp: new Date().toISOString(), acknowledgedAt: null, acknowledgedBy: null
  }
];

export const useAlertStore = () => {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [filterSeverity, setFilterSeverityState] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatusState] = useState<'all' | string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadAlerts = useCallback(async () => {
    setIsLoading(false);
  }, []);
  const setFilterSeverity = useCallback((value: string) => setFilterSeverityState(value), []);
  const setFilterStatus = useCallback((value: string) => setFilterStatusState(value), []);
  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, status: 'acknowledged', acknowledgedAt: new Date().toISOString(), acknowledgedBy: 'Operator' } : alert));
  }, []);
  const resolveAlert = useCallback((id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  return { alerts, filterSeverity, filterStatus, isLoading, loadAlerts, setFilterSeverity, setFilterStatus, acknowledgeAlert, resolveAlert };
};
