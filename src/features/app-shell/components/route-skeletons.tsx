import { createElement, type ComponentType, type ReactNode } from "react";

import { AreasPageSkeleton } from "@/features/areas/components/area-list-skeleton";
import { ArchivesPageSkeleton } from "@/features/archives/components/archive-list";
import { BoardPageSkeleton } from "@/features/boards/components/board-skeletons";
import { FocusPageSkeleton } from "@/features/focus/components/focus-page-skeleton";
import { HabitsPageSkeleton } from "@/features/habits/components/habit-skeletons";
import { HomePageSkeleton } from "@/features/home/components/home-skeletons";
import { JournalPageSkeleton } from "@/features/journal/components/journal-skeletons";
import { LettersPageSkeleton } from "@/features/letters/components/letters-skeletons";
import { NotesPageSkeleton } from "@/features/notes/components/note-skeletons";
import { PlansPageSkeleton } from "@/features/plans/components/plans-skeletons";
import { ProjectsPageSkeleton } from "@/features/projects/components/project-skeletons";
import { ResourcesPageSkeleton } from "@/features/resources/components/resource-skeletons";

// The same skeletons each page shows while its own data loads, so the
// workspace loader hands off to the page without the layout changing.
const routeSkeletons: Record<string, ComponentType> = {
  "/home": HomePageSkeleton,
  "/projects": ProjectsPageSkeleton,
  "/areas": AreasPageSkeleton,
  "/resources": ResourcesPageSkeleton,
  "/archives": ArchivesPageSkeleton,
  "/board": BoardPageSkeleton,
  "/focus": FocusPageSkeleton,
  "/habits": HabitsPageSkeleton,
  "/notes": NotesPageSkeleton,
  "/journal": JournalPageSkeleton,
  "/letters": LettersPageSkeleton,
  "/plans": PlansPageSkeleton,
};

/** Exact list routes only; detail pages get `null` and use the generic skeleton. */
export function renderRouteSkeleton(pathname: string): ReactNode {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const skeleton = routeSkeletons[path];
  return skeleton ? createElement(skeleton) : null;
}
