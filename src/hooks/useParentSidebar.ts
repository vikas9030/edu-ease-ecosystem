import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { useAuth } from '@/hooks/useAuth';
import { getFilteredParentSidebarItems } from '@/config/parentSidebar';

export function useParentSidebar() {
  const { schoolId, userRole } = useAuth();
  const { isModuleEnabled } = useModuleVisibility(schoolId, userRole);
  return getFilteredParentSidebarItems(isModuleEnabled);
}
