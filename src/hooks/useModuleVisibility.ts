import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ModuleVisibility {
  module_key: string;
  module_label: string;
  is_enabled: boolean;
}

interface SchoolOverride {
  module_key: string;
  is_enabled: boolean;
}

let cachedModules: ModuleVisibility[] | null = null;
let cachedOverrides: Record<string, SchoolOverride[]> = {};
let fetchPromise: Promise<ModuleVisibility[]> | null = null;

async function fetchModules(): Promise<ModuleVisibility[]> {
  const { data, error } = await supabase
    .from('module_visibility')
    .select('module_key, module_label, is_enabled');
  if (error) {
    console.error('Error fetching module visibility:', error);
    return [];
  }
  return (data as any[]) || [];
}

async function fetchSchoolOverrides(schoolId: string): Promise<SchoolOverride[]> {
  const { data, error } = await supabase
    .from('school_module_overrides')
    .select('module_key, is_enabled')
    .eq('school_id', schoolId);
  if (error) {
    console.error('Error fetching school overrides:', error);
    return [];
  }
  return (data as any[]) || [];
}

async function getCachedModules(): Promise<ModuleVisibility[]> {
  if (cachedModules && cachedModules.length > 0) {
    return cachedModules;
  }

  if (!fetchPromise) {
    fetchPromise = fetchModules()
      .then((data) => {
        cachedModules = data;
        return data;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }

  return fetchPromise;
}

// Clear cache on auth state change
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    cachedModules = null;
    cachedOverrides = {};
    fetchPromise = null;
  }
});

export function useModuleVisibility(schoolId?: string | null, userRole?: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [modules, setModules] = useState<ModuleVisibility[]>(cachedModules || []);
  const [overrides, setOverrides] = useState<SchoolOverride[]>([]);
  const [loading, setLoading] = useState(authLoading || !cachedModules);

  const refetch = useCallback(async () => {
    if (authLoading || !user) return;

    setLoading(true);
    cachedModules = null;
    cachedOverrides = {};
    fetchPromise = null;
    const data = await getCachedModules();
    setModules(data);

    if (schoolId && userRole !== 'super_admin') {
      const ov = await fetchSchoolOverrides(schoolId);
      cachedOverrides[schoolId] = ov;
      setOverrides(ov);
    } else {
      setOverrides([]);
    }
    setLoading(false);
  }, [authLoading, schoolId, userRole, user]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setModules([]);
      setOverrides([]);
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadVisibility = async () => {
      setLoading(true);

      const data = await getCachedModules();
      if (!isActive) return;

      setModules(data);

      if (schoolId && userRole !== 'super_admin') {
        if (cachedOverrides[schoolId]) {
          setOverrides(cachedOverrides[schoolId]);
          setLoading(false);
          return;
        }

        const ov = await fetchSchoolOverrides(schoolId);
        cachedOverrides[schoolId] = ov;
        if (!isActive) return;

        setOverrides(ov);
      } else {
        setOverrides([]);
      }

      if (isActive) {
        setLoading(false);
      }
    };

    void loadVisibility();

    return () => {
      isActive = false;
    };
  }, [authLoading, schoolId, userRole, user]);

  const isModuleEnabled = useCallback((key: string): boolean => {
    const mod = modules.find((m) => m.module_key === key);
    const systemEnabled = mod ? mod.is_enabled : true;

    // Super admins see everything based on system-level only
    if (userRole === 'super_admin') return systemEnabled;

    // For school users, check override
    if (!systemEnabled) return false;
    const override = overrides.find((o) => o.module_key === key);
    if (override) return override.is_enabled;
    return true;
  }, [modules, overrides, userRole]);

  return { modules, loading, isModuleEnabled, refetch };
}
