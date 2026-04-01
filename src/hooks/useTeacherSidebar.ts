import { useLeadPermissions } from '@/hooks/useLeadPermissions';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { useAuth } from '@/hooks/useAuth';
import { getTeacherSidebarItems } from '@/config/teacherSidebar';

export function useTeacherSidebar() {
  const { schoolId, userRole } = useAuth();
  const { hasAccess } = useLeadPermissions();
  const { isModuleEnabled } = useModuleVisibility(schoolId, userRole);
  return getTeacherSidebarItems(hasAccess, isModuleEnabled);
}
