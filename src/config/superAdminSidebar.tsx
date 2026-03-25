import {
  LayoutDashboard,
  ToggleLeft,
  Users,
  GraduationCap,
  UserPlus,
  Settings,
  CalendarDays,
} from 'lucide-react';

export const superAdminSidebarItems = [
  { icon: <LayoutDashboard className="h-5 w-5" />, label: 'Dashboard', path: '/super-admin' },
  { icon: <ToggleLeft className="h-5 w-5" />, label: 'Module Control', path: '/super-admin/modules' },
  { icon: <Users className="h-5 w-5" />, label: 'Manage Admins', path: '/super-admin/admins' },
  { icon: <CalendarDays className="h-5 w-5" />, label: 'Holidays', path: '/admin/holidays' },
  { icon: <Settings className="h-5 w-5" />, label: 'Settings', path: '/super-admin/settings' },
];
