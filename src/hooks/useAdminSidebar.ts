import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { useAuth } from '@/hooks/useAuth';
import { getFilteredAdminSidebarItems } from '@/config/adminSidebar';

export function useAdminSidebar() {
  const { schoolId, userRole } = useAuth();
  const { isModuleEnabled } = useModuleVisibility(schoolId, userRole);
  return getFilteredAdminSidebarItems(isModuleEnabled);
}
