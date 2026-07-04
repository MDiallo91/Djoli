/**
 * hooks/useSchools.ts
 * Charge et expose la liste des établissements depuis l'API admin.
 * Consommé par : context/AdminContext (source principale),
 *                DashboardTab, SchoolsTab, PendingTab, SubscriptionsTab,
 *                AccueilSection (sélection écoles de confiance)
 */

import { useState, useEffect, useCallback } from 'react';
import type { School } from '../types/admin';
import { API_ADMIN } from '../constants/api';

interface UseSchoolsResult {
  schools:      School[];
  loading:      boolean;
  error:        string | null;
  fetchSchools: () => Promise<void>;
  pendingCount: number;
}

function parseSchool(s: any): School {
  return {
    ...s,
    // levels peut arriver en JSON string depuis le backend
    levels: (() => {
      try { return Array.isArray(s.levels) ? s.levels : JSON.parse(s.levels || '[]'); }
      catch { return []; }
    })(),
  };
}

export function useSchools(): UseSchoolsResult {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API_ADMIN}/schools`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setSchools(Array.isArray(data) ? data.map(parseSchool) : []);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur chargement établissements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  return {
    schools,
    loading,
    error,
    fetchSchools,
    pendingCount: schools.filter(s => s.approvalStatus === 'pending').length,
  };
}
