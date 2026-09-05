import {
  Archive,
  BookHeart,
  BookOpen,
  BookText,
  CalendarCheck,
  CirclePile,
  Home,
  KanbanSquare,
  NotebookPen,
  StarCheck,
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
    label: "Organize",
    items: [
      { label: "Projects", href: "/projects", icon: Target },
      { label: "Areas", href: "/areas", icon: CirclePile },
      { label: "Resources", href: "/resources", icon: BookOpen },
      { label: "Archives", href: "/archives", icon: Archive },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Board", href: "/board", icon: KanbanSquare },
      { label: "Pomodoro Timer", href: "/pomodoro", icon: Timer },
      { label: "Habits", href: "/habits", icon: StarCheck },
      { label: "Notes", href: "/notes", icon: NotebookPen },
      { label: "Journal", href: "/journal", icon: BookHeart },
      { label: "Letters", href: "/letters", icon: BookText },
      { label: "Plans", href: "/plans", icon: CalendarCheck },
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
