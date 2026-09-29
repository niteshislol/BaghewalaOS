import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, Plus, CheckCircle2, Clock, Wrench, ChevronRight, User, Calendar, AlertTriangle, Lightbulb, CheckSquare } from 'lucide-react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Modal } from '../components/ui/Modal';
import { DataProvenanceBadge } from '../components/ui/DataProvenanceBadge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useWorkOrderStore } from '../stores/useWorkOrderStore';
import { useUIStore } from '../stores/useUIStore';
import { WorkOrderPriority, WorkOrderStatus } from '../types';

export const WorkOrdersPage: React.FC = () => {
  const { workOrders, isLoading, loadWorkOrders, setFilterStatus, filterStatus, createWorkOrder, updateOrderStatus } =
    useWorkOrderStore();
  const { createWorkOrderModalOpen, setCreateWorkOrderModalOpen } = useUIStore();

  // Form State for Create Work Order Modal
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'P1 - Immediate' as WorkOrderPriority,
    subsystem: 'Artificial Lift (SRP)',
    assignedTo: 'Vikram Singh (Field Technician - Lift)',
    dueDate: 'Today 18:00 UTC',
  });

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  const filteredOrders = workOrders.filter((wo) => {
    if (filterStatus === 'all') return true;
    return wo.status === filterStatus;
  });

  const handleSubmitNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    await createWorkOrder({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: 'Open',
      assignedTo: formData.assignedTo,
      subsystem: formData.subsystem,
      dueDate: formData.dueDate,
      notes: ['Work order initialized by Petroleum Engineer Rajesh Verma.'],
    });

    setCreateWorkOrderModalOpen(false);
    setFormData({
      title: '',
      description: '',
      priority: 'P1 - Immediate',
      subsystem: 'Artificial Lift (SRP)',
      assignedTo: 'Vikram Singh (Field Technician - Lift)',
      dueDate: 'Today 18:00 UTC',
    });
  };

  const getPriorityBadge = (priority: WorkOrderPriority) => {
    if (priority.startsWith('P1')) {
      return 'bg-status-crit-bg text-status-crit border-status-crit/40';
    }
    if (priority.startsWith('P2')) {
      return 'bg-status-warn-bg text-status-warn border-status-warn/40';
    }
    return 'bg-surface-secondary text-ink-secondary border-border';
  };

  const getStatusBadge = (status: WorkOrderStatus) => {
    if (status === 'Completed') {
      return 'bg-status-green-bg text-status-green border-status-green/40';
    }
    if (status === 'In Progress') {
      return 'bg-petroleum-tint text-petroleum border-petroleum/40';
    }
    return 'bg-surface-secondary text-ink-muted border-border';
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Field Work Orders & Maintenance Dispatch"
        subtitle="Operational action tracking, mechanical intervention dispatch, and field technician task execution for Well BW-017."
        badge={`${workOrders.length} Dispatches`}
        actions={
          <button
            type="button"
            onClick={() => setCreateWorkOrderModalOpen(true)}
            className="h-8 px-3 rounded-lg bg-petroleum hover:bg-petroleum-hover text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Work Order</span>
          </button>
        }
      />

      {/* Visual Operational Workflow Pipeline */}
      <div className="bg-surface border border-border rounded-xl p-3.5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-ink-muted uppercase font-sans text-[10px] font-bold">Closed-Loop Workflow:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-ink">
          <span className="flex items-center gap-1 text-status-crit font-semibold bg-status-crit-bg px-2 py-0.5 rounded border border-status-crit/30">
            <AlertTriangle className="w-3 h-3" /> Alert
          </span>
          <span className="text-ink-muted">→</span>
          <span className="flex items-center gap-1 text-petroleum font-semibold bg-petroleum-tint px-2 py-0.5 rounded border border-petroleum/30">
            <Lightbulb className="w-3 h-3" /> Engineering Insight
          </span>
          <span className="text-ink-muted">→</span>
          <span className="flex items-center gap-1 text-status-warn font-semibold bg-status-warn-bg px-2 py-0.5 rounded border border-status-warn/30">
            <CheckSquare className="w-3 h-3" /> Recommendation
          </span>
          <span className="text-ink-muted">→</span>
          <span className="flex items-center gap-1 text-status-green font-semibold bg-status-green-bg px-2 py-0.5 rounded border border-status-green/30">
            <FileSpreadsheet className="w-3 h-3" /> Work Order (Execution)
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b border-border text-xs">
        <span className="font-semibold text-ink-muted uppercase mr-2">Status:</span>
        {(['all', 'Open', 'In Progress', 'Completed'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors border ${
              filterStatus === status
                ? 'bg-surface text-ink border-petroleum shadow-sm'
                : 'bg-surface-secondary text-ink-secondary border-border hover:text-ink'
            }`}
          >
            {status === 'all' ? 'All Orders' : status}
          </button>
        ))}
      </div>

      {/* Work Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No work orders in this view"
          description="There are currently no maintenance work orders matching the selected status filter."
          actionText="Create Work Order"
          onAction={() => setCreateWorkOrderModalOpen(true)}
        />
      ) : (
        <div className="space-y-3.5">
          {filteredOrders.map((wo) => (
            <div
              key={wo.id}
              className="bg-surface border border-border rounded-xl p-4 sm:p-5 shadow-subtle flex flex-col justify-between"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-petroleum bg-petroleum-tint px-2 py-0.5 rounded border border-petroleum/30">
                      {wo.orderNumber}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getPriorityBadge(wo.priority)}`}>
                      {wo.priority}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusBadge(wo.status)}`}>
                      {wo.status}
                    </span>
                    <span className="text-xs text-ink-muted">·</span>
                    <span className="text-xs text-ink-secondary font-mono">{wo.subsystem}</span>
                  </div>

                  <h2 className="font-heading text-base font-bold text-ink mt-2">
                    {wo.title}
                  </h2>

                  <p className="text-xs text-ink-secondary leading-relaxed mt-1 max-w-3xl">
                    {wo.description}
                  </p>
                </div>

                {/* Status Switcher Action */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                  {wo.status === 'Open' && (
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(wo.id, 'In Progress')}
                      className="h-8 px-3 rounded-lg border border-petroleum text-petroleum hover:bg-petroleum-tint text-xs font-semibold transition-colors"
                    >
                      Start Task
                    </button>
                  )}
                  {wo.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => updateOrderStatus(wo.id, 'Completed')}
                      className="h-8 px-3 rounded-lg bg-status-green hover:bg-status-green-deep text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                      Mark Complete
                    </button>
                  )}
                  {wo.status === 'Completed' && (
                    <span className="text-xs font-semibold text-status-green flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Closed & Logged</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Work Order Footer & Notes */}
              <div className="mt-4 pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-muted gap-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    <User className="w-3.5 h-3.5 text-ink-muted" />
                    {wo.assignedTo}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                    Due: {wo.dueDate}
                  </span>
                </div>

                {wo.notes && wo.notes.length > 0 && (
                  <span className="text-ink-secondary italic text-[11px] truncate max-w-md">
                    Latest log: "{wo.notes[wo.notes.length - 1]}"
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Modal: Create Work Order */}
      <Modal
        isOpen={createWorkOrderModalOpen}
        onClose={() => setCreateWorkOrderModalOpen(false)}
        title="Dispatch Field Work Order"
        subtitle="Assign an operational task or maintenance job for Well BW-017"
      >
        <form onSubmit={handleSubmitNewOrder} className="space-y-4 text-xs">
          <div>
            <label className="block text-ink font-semibold mb-1">Work Order Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Trim VFD speed and reshoot dyno card"
              className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum focus:ring-1 focus:ring-petroleum"
            />
          </div>

          <div>
            <label className="block text-ink font-semibold mb-1">Detailed Work Scope</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe physical procedure, equipment tags, safety protocols, and verification tests..."
              className="w-full p-3 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum focus:ring-1 focus:ring-petroleum leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-ink font-semibold mb-1">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as WorkOrderPriority })}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum"
              >
                <option value="P1 - Immediate">P1 - Immediate Intervention</option>
                <option value="P2 - Scheduled">P2 - Scheduled Maintenance</option>
                <option value="P3 - Routine">P3 - Routine Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-ink font-semibold mb-1">Subsystem Domain</label>
              <select
                value={formData.subsystem}
                onChange={(e) => setFormData({ ...formData, subsystem: e.target.value })}
                className="w-full h-9 px-2.5 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum"
              >
                <option value="Artificial Lift (SRP)">Artificial Lift (SRP)</option>
                <option value="Wellbore & Hydraulics">Wellbore & Hydraulics</option>
                <option value="Wellhead Surface">Wellhead Surface</option>
                <option value="CSS Thermal & Steam">CSS Thermal & Steam</option>
                <option value="Surface / Gathering">Surface / Gathering</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-ink font-semibold mb-1">Assigned Technician</label>
              <input
                type="text"
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum"
              />
            </div>

            <div>
              <label className="block text-ink font-semibold mb-1">Target Completion Due Date</label>
              <input
                type="text"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-ink text-xs focus:border-petroleum"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateWorkOrderModalOpen(false)}
              className="h-8 px-4 rounded-lg border border-border bg-surface hover:bg-surface-secondary text-ink text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 rounded-lg bg-petroleum hover:bg-petroleum-hover text-white text-xs font-semibold shadow-sm"
            >
              Dispatch Work Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


export default WorkOrdersPage;
