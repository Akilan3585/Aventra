import {
  BarChart3,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings,
  UsersRound,
  Wrench,
} from "lucide-react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: UsersRound },
  { href: "/attendance", label: "Attendance", icon: GraduationCap },
  { href: "/schedules", label: "Schedules", icon: CalendarDays },
  { href: "/classrooms", label: "Classrooms", icon: UsersRound },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
