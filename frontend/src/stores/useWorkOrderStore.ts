import { useCallback, useState } from 'react';
import type { WorkOrderPriority, WorkOrderStatus } from '../types';
import api from '../services/api';

type WorkOrder = {
  id: string;
  orderNumber: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  subsystem: string;
  assignedTo: string;
  dueDate: string;
  notes: string | string[];
};

export const useWorkOrderStore = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filterStatus, setFilterStatusState] = useState<'all' | WorkOrderStatus>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadWorkOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/work-orders');
      setWorkOrders(data.map((d: any) => ({
        ...d,
        orderNumber: d.id,
        subsystem: d.type === 'preventive' ? 'General' : 'Equipment',
        notes: []
      })));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }, []);

  const setFilterStatus = useCallback((status: 'all' | WorkOrderStatus) => {
    setFilterStatusState(status);
  }, []);

  const createWorkOrder = useCallback(async (order: Partial<WorkOrder>) => {
    const payload = {
      title: order.title || 'Untitled work order',
      description: order.description || '',
      priority: order.priority || 'P3 - Routine',
      status: order.status || 'Open',
      type: 'corrective',
      assignedTo: order.assignedTo || 'Maintenance Team',
      dueDate: order.dueDate || 'TBD',
      wellId: 'BGW-01'
    };
    try {
      const { data } = await api.post('/work-orders', payload);
      const newOrder = {
        ...data,
        orderNumber: data.id,
        subsystem: 'Equipment',
        notes: []
      };
      setWorkOrders((current) => [newOrder, ...current]);
      return newOrder;
    } catch (e) {
      console.error(e);
    }
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: string) => {
    try {
      await api.patch(`/work-orders/${id}/status`, { status });
      setWorkOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { workOrders, isLoading, loadWorkOrders, setFilterStatus, filterStatus, createWorkOrder, updateOrderStatus };
};
