import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
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

import type { Role } from "@/server/auth/permissions";

export type NavigationItem = { href: string; icon: LucideIcon; label: string };
export type NavigationGroup = { items: readonly NavigationItem[]; label: string };

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
      { href: "/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/enrollments", label: "Enrollments", icon: BookOpen },
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

const studentNavigation: readonly NavigationGroup[] = [
  { label: "My college", items: [{ href: "/student-workspace", label: "My workspace", icon: LayoutDashboard }] },
  { label: "Learning", items: [{ href: "/assignments", label: "My assignments", icon: ClipboardList }] },
  { label: "Account", items: [
    { href: "/notifications", label: "Messages", icon: Bell },
    { href: "/profile", label: "My profile", icon: UserRound },
  ] },
];

const facultyNavigation: readonly NavigationGroup[] = [
  { label: "Teaching", items: [
    { href: "/faculty-workspace", label: "Teaching home", icon: LayoutDashboard },
    { href: "/attendance", label: "Take attendance", icon: ClipboardCheck },
    { href: "/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/schedules", label: "My timetable", icon: CalendarDays },
    { href: "/students", label: "My students", icon: GraduationCap },
    { href: "/courses", label: "Courses", icon: BookOpen },
  ] },
  { label: "Support", items: [
    { href: "/agents", label: "AI assistant", icon: Bot },
    { href: "/notifications", label: "Messages", icon: Bell },
    { href: "/profile", label: "My profile", icon: UserRound },
  ] },
];

const maintenanceNavigation: readonly NavigationGroup[] = [
  { label: "My work", items: [
    { href: "/maintenance", label: "Maintenance queue", icon: Wrench },
    { href: "/equipment", label: "Equipment", icon: Boxes },
    { href: "/classrooms", label: "Spaces", icon: Building2 },
  ] },
  { label: "Account", items: [
    { href: "/notifications", label: "Messages", icon: Bell },
    { href: "/profile", label: "My profile", icon: UserRound },
  ] },
];

export function navigationForRole(role: Role | null): readonly NavigationGroup[] {
  if (role === "student") return studentNavigation;
  if (role === "faculty") return facultyNavigation;
  if (role === "maintenance-staff") return maintenanceNavigation;
  return navigationGroups;
}

export function homeForRole(role: Role | null) {
  if (role === "student") return "/student-workspace";
  if (role === "faculty") return "/faculty-workspace";
  if (role === "maintenance-staff") return "/maintenance";
  return "/dashboard";
}

export function findNavigationItem(pathname: string) {
  return navigationItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

export const moduleKeywords: Record<string, string> = {
  "/agents": "automation decisions evidence orchestration",
  "/analytics": "insights charts intelligence trends",
  "/attendance": "presence sessions participation",
  "/assignments": "coursework submissions grading feedback deadlines",
  "/audit-logs": "security history activity compliance",
  "/classrooms": "rooms capacity utilization readiness",
  "/dashboard": "overview home operations campus",
  "/equipment": "assets inventory devices lifecycle",
  "/maintenance": "tickets facilities repairs sla",
  "/performance": "results grades cgpa student success",
  "/schedules": "timetable classes conflicts allocation",
  "/students": "roster learners enrollment risk",
  "/enrollments": "registration sections students capacity",
  "/student-workspace": "student home classes timetable attendance results",
  "/faculty-workspace": "faculty teaching home classes attendance learners",
};
