import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useSchoolBranding() {
  const { schoolId, userRole } = useAuth();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || userRole === 'super_admin') return;
    supabase
      .from('schools')
      .select('name, logo_url')
      .eq('id', schoolId)
      .maybeSingle()
      .then(({ data }) => {
        setSchoolName(data?.name || null);
        setSchoolLogo(data?.logo_url || null);
      });
  }, [schoolId, userRole]);

  return { schoolName, schoolLogo };
}
