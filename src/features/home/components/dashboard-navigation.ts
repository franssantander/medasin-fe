import {
  Archive,
  BookHeart,
  BookOpen,
  CirclePile,
  Home,
  KanbanSquare,
  NotebookPen,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardHomeItem: DashboardNavigationItem = {
  label: "Home",
  href: "/home",
  icon: Home,
};

export const dashboardNavigationGroups: {
  label: string;
  items: DashboardNavigationItem[];
}[] = [
  {
    label: "Core",
    items: [
      { label: "Projects", href: "/projects", icon: Target },
      { label: "Areas", href: "/areas", icon: CirclePile },
      { label: "Resources", href: "/resources", icon: BookOpen },
      { label: "Archives", href: "/archives", icon: Archive },
    ],
  },
  {
    label: "Utilities",
    items: [
      { label: "Board", href: "/board", icon: KanbanSquare },
      { label: "Pomodoro Timer", href: "/pomodoro", icon: Timer },
      { label: "Notes", href: "/notes", icon: NotebookPen },
      { label: "Journal", href: "/journal", icon: BookHeart },
    ],
  },
];

export const dashboardNavigationItems: DashboardNavigationItem[] = [
  dashboardHomeItem,
  ...dashboardNavigationGroups.flatMap((group) => group.items),
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
