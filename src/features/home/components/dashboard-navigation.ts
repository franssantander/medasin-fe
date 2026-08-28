import {
  Archive,
  BookOpen,
  CirclePile,
  Home,
  Target,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardNavigationItems: DashboardNavigationItem[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Projects", href: "/projects", icon: Target },
  { label: "Areas", href: "/areas", icon: CirclePile },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Archives", href: "/archives", icon: Archive },
];

export function isActiveDashboardRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardTitle(pathname: string) {
  return (
    dashboardNavigationItems.find((item) =>
      isActiveDashboardRoute(pathname, item.href),
    )?.label ?? "Home"
  );
}
