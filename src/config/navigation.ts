import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileBarChart,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  ScrollText,
  Settings,
  TrendingUp,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavigationItem = { href: string; icon: LucideIcon; label: string };
type NavigationGroup = { items: readonly NavigationItem[]; label: string };

export const navigationGroups: readonly NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Academic ops",
    items: [
      { href: "/students", label: "Students", icon: GraduationCap },
      { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/schedules", label: "Schedules", icon: CalendarDays },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/departments", label: "Departments", icon: Building2 },
      { href: "/faculty", label: "Faculty", icon: UsersRound },
      { href: "/performance", label: "Performance", icon: TrendingUp },
    ],
  },
  {
    label: "Campus ops",
    items: [
      { href: "/classrooms", label: "Classrooms", icon: Building2 },
      { href: "/laboratories", label: "Labs", icon: FlaskConical },
      { href: "/equipment", label: "Equipment", icon: Boxes },
      { href: "/maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/agents", label: "AI Agents", icon: Bot },
      { href: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/profile", label: "Profile", icon: UserRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

export const navigationItems = navigationGroups.flatMap((group) => group.items);

export function findNavigationItem(pathname: string) {
  return navigationItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export const moduleKeywords: Record<string, string> = {
  "/agents": "automation decisions evidence orchestration",
  "/analytics": "insights charts intelligence trends",
  "/attendance": "presence sessions participation",
  "/audit-logs": "security history activity compliance",
  "/classrooms": "rooms capacity utilization readiness",
  "/dashboard": "overview home operations campus",
  "/equipment": "assets inventory devices lifecycle",
  "/maintenance": "tickets facilities repairs sla",
  "/performance": "results grades cgpa student success",
  "/schedules": "timetable classes conflicts allocation",
  "/students": "roster learners enrollment risk",
};
