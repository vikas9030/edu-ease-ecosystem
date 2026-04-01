import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

// Clear cache on auth state change
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
    cachedModules = null;
    cachedOverrides = {};
    fetchPromise = null;
  }
});

export function useModuleVisibility(schoolId?: string | null, userRole?: string | null) {
  const [modules, setModules] = useState<ModuleVisibility[]>(cachedModules || []);
  const [overrides, setOverrides] = useState<SchoolOverride[]>([]);
  const [loading, setLoading] = useState(!cachedModules);

  const refetch = useCallback(async () => {
    setLoading(true);
    cachedModules = null;
    cachedOverrides = {};
    fetchPromise = null;
    const data = await fetchModules();
    cachedModules = data;
    setModules(data);

    if (schoolId && userRole !== 'super_admin') {
      const ov = await fetchSchoolOverrides(schoolId);
      cachedOverrides[schoolId] = ov;
      setOverrides(ov);
    } else {
      setOverrides([]);
    }
    setLoading(false);
  }, [schoolId, userRole]);

  useEffect(() => {
    // Fetch system modules
    if (cachedModules && cachedModules.length > 0) {
      setModules(cachedModules);
    } else {
      if (!fetchPromise) {
        fetchPromise = fetchModules();
      }
      fetchPromise.then((data) => {
        cachedModules = data;
        setModules(data);
      });
    }

    // Fetch school overrides for non-super-admin users
    if (schoolId && userRole !== 'super_admin') {
      if (cachedOverrides[schoolId]) {
        setOverrides(cachedOverrides[schoolId]);
        setLoading(false);
      } else {
        fetchSchoolOverrides(schoolId).then((ov) => {
          cachedOverrides[schoolId] = ov;
          setOverrides(ov);
          setLoading(false);
        });
      }
    } else {
      setOverrides([]);
      if (cachedModules) setLoading(false);
      else {
        fetchPromise?.then(() => setLoading(false));
      }
    }
  }, [schoolId, userRole]);

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
