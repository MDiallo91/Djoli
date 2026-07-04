/**
 * hooks/useSettings.ts
 * Hook générique pour charger et sauvegarder n'importe quelle clé de settings.
 * Consommé par : SiteSection, ContactSection, TarificationSection,
 *                AccueilSection, EmailSection, SmsSection, PushSection, PaymentSection
 */

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { API_SETTINGS } from '../constants/api';

interface UseSettingsResult<T> {
  data:    T;
  loading: boolean;
  saving:  boolean;
  error:   string | null;
  setData: (d: T | ((prev: T) => T)) => void;
  save:    () => Promise<boolean>;
  reload:  () => Promise<void>;
}

export function useSettings<T>(key: string, defaultValue: T): UseSettingsResult<T> {
  const [data,    setData]    = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get<{ statut: number; data: T }>(
        `${API_SETTINGS}/${key}`
      );
      if (res?.data) setData(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`${API_SETTINGS}/${key}`, { data });
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Erreur sauvegarde');
      return false;
    } finally {
      setSaving(false);
    }
  }, [key, data]);

  return { data, loading, saving, error, setData, save, reload };
}
