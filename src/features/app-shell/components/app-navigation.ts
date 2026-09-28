import {
  Archive,
  BookHeart,
  BookOpen,
  CalendarCheck,
  CirclePile,
  Feather,
  House,
  KanbanSquare,
  NotebookPen,
  StarCheck,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";

export type AppNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const homeNavigationItem: AppNavigationItem = {
  label: "Home",
  href: "/home",
  icon: House,
};

export const appNavigationGroups: {
  label: string;
  items: AppNavigationItem[];
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
      { label: "Focus", href: "/focus", icon: Timer },
      { label: "Habits", href: "/habits", icon: StarCheck },
      { label: "Notes", href: "/notes", icon: NotebookPen },
      { label: "Journal", href: "/journal", icon: BookHeart },
      { label: "Letters", href: "/letters", icon: Feather },
      { label: "Plans", href: "/plans", icon: CalendarCheck },
    ],
  },
];

export const appNavigationItems: AppNavigationItem[] = [
  homeNavigationItem,
  ...appNavigationGroups.flatMap((group) => group.items),
];

export function isActiveAppRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

