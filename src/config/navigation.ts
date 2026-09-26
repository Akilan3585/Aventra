import {
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  TrendingUp,
  UserRound,
  UserCheck,
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
      { href: "/student-approvals", label: "Student approvals", icon: UserCheck },
      { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/assignments", label: "Assignments", icon: ClipboardList },
      { href: "/courses", label: "Courses", icon: BookOpen },
      { href: "/performance", label: "Performance", icon: TrendingUp },
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
] as const;

export const navigationItems = navigationGroups.flatMap((group) => group.items);

const studentNavigation: readonly NavigationGroup[] = [
  { label: "My college", items: [{ href: "/student-workspace", label: "My workspace", icon: LayoutDashboard }] },
  { label: "Learning", items: [
    { href: "/assignments", label: "My assignments", icon: ClipboardList },
    { href: "/courses", label: "Study materials", icon: BookOpen },
  ] },
  { label: "Account", items: [
    { href: "/notifications", label: "Messages", icon: Bell },
    { href: "/profile", label: "My profile", icon: UserRound },
  ] },
];

export function navigationForRole(role: Role | null): readonly NavigationGroup[] {
  if (role === "student") return studentNavigation;
  return navigationGroups;
}

export function homeForRole(role: Role | null) {
  if (role === "student") return "/student-workspace";
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
  "/dashboard": "overview home operations campus",
  "/performance": "results grades cgpa student success linkedin hackerrank codechef leetcode github coding profiles",
  "/students": "roster learners enrollment risk",
  "/courses": "catalog offerings notes study materials",
  "/student-approvals": "pending student onboarding verification approval",
  "/student-workspace": "student home classes timetable attendance results",
};
