import { useCallback, useState } from 'react';
import { api, ApiError } from '../services/api';
import { Subscription, SubscriptionFormData } from '../types';
import { showToast } from '../components/ui';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.subscriptions.list();
      setSubscriptions(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setSubscriptions([]);
      showToast('error', 'Error de conexion', 'No se pudieron cargar las suscripciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.subscriptions.list();
      setSubscriptions(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      showToast('error', 'Error', 'No se pudieron actualizar las suscripciones.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const create = useCallback(async (data: SubscriptionFormData): Promise<boolean> => {
    try {
      await api.subscriptions.create(data);
      showToast('success', 'Guardado', 'Suscripcion agregada.');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo guardar.');
      return false;
    }
  }, []);

  const update = useCallback(
    async (uuid: string, data: Partial<SubscriptionFormData>): Promise<boolean> => {
      try {
        await api.subscriptions.update(uuid, data);
        showToast('success', 'Guardado', 'Suscripcion actualizada.');
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
      await api.subscriptions.delete(uuid);
      showToast('success', 'Eliminada', 'Suscripcion eliminada.');
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return false;
      showToast('error', 'Error', err instanceof Error ? err.message : 'No se pudo eliminar.');
      return false;
    }
  }, []);

  const processDue = useCallback(async (): Promise<void> => {
    try {
      const charged = await api.subscriptions.processDue();
      if (charged.length > 0) {
        const names = charged.map((t) => t.description?.split(' (')[0] ?? 'Suscripcion').join(', ');
        showToast('success', 'Cobros registrados', names);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      // Silent fail — don't interrupt the user on app open
    }
  }, []);

  return {
    subscriptions,
    loading,
    refreshing,
    fetchSubscriptions,
    refresh,
    create,
    update,
    remove,
    processDue,
  };
}
