import {
  LayoutDashboard,
  ToggleLeft,
  Users,
  School,
  Settings,
} from 'lucide-react';

export const superAdminSidebarItems = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/super-admin' },
  { icon: <School className="h-5 w-5" />, label: 'Schools', path: '/super-admin/schools' },
  { icon: <ToggleLeft className="h-5 w-5" />, label: 'Module Control', path: '/super-admin/modules' },
  { icon: <Users className="h-5 w-5" />, label: 'Manage Admins', path: '/super-admin/admins' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/super-admin/settings' },
];
