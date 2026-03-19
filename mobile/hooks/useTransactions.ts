import { useCallback, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Transaction, TransactionFormData } from '../types';
import { showToast } from '../components/ui';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = useCallback(async (dateFrom: string, dateTo: string) => {
    setLoading(true);
    try {
      const data = await api.transactions.list({ dateFrom, dateTo });
      setTransactions(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setTransactions([]);
      showToast('error', 'Error de conexion', 'No se pudieron cargar las transacciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (dateFrom: string, dateTo: string) => {
    setRefreshing(true);
    try {
      const data = await api.transactions.list({ dateFrom, dateTo });
      setTransactions(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      showToast('error', 'Error', 'No se pudieron actualizar los datos.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const create = useCallback(async (data: TransactionFormData): Promise<boolean> => {
    try {
      const result = await api.transactions.create(data);
      const count = Array.isArray(result) ? result.length : 1;
      const typeLabel = data.type === 'income' ? 'Ingreso' : 'Gasto';
      const message =
        count > 1 ? `${typeLabel} registrado en ${count} cuotas.` : `${typeLabel} registrado.`;
      showToast('success', 'Guardado', message);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo guardar.');
      return false;
    }
  }, []);

  const update = useCallback(
    async (uuid: string, data: Partial<TransactionFormData>): Promise<boolean> => {
      try {
        await api.transactions.update(uuid, data);
        showToast('success', 'Guardado', 'Transaccion actualizada.');
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return false;
        showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo actualizar.');
        return false;
      }
    },
    [],
  );

  const remove = useCallback(async (uuid: string): Promise<boolean> => {
    try {
      await api.transactions.delete(uuid);
      showToast('success', 'Eliminado', 'Transaccion eliminada.');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo eliminar.');
      return false;
    }
  }, []);

  return { transactions, loading, refreshing, fetchTransactions, refresh, create, update, remove };
}
