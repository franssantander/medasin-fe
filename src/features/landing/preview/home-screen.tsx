"use client";

import {
  Archive,
  ArrowRight,
  BookHeart,
  BookOpen,
  CalendarCheck,
  Circle,
  CirclePile,
  Feather,
  File,
  Flame,
  ImageIcon,
  KanbanSquare,
  Link2,
  Newspaper,
  NotebookPen,
  Sprout,
  StarCheck,
  Target,
  Timer,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dayGroupLabel, formatPlanTime, localDateKey, planDayKey } from "@/features/plans/plan-time";
import { cn } from "@/lib/utils";
import { buildPreviewPlans, previewAreas, previewFocusTasks, previewResources, previewStages } from "./preview-fixtures";

const resourceTypeIcons: Record<string, LucideIcon> = { note: BookOpen, link: Link2, file: File, image: ImageIcon };

const tools = [
  { label: "Board", icon: KanbanSquare },
  { label: "Focus", icon: Timer },
  { label: "Habits", icon: StarCheck },
  { label: "Notes", icon: NotebookPen },
  { label: "Journal", icon: BookHeart },
  { label: "Letters", icon: Feather },
  { label: "Plans", icon: CalendarCheck },
];

const projectTasks = previewStages.reduce((sum, stage) => sum + stage.tasks.length, 0);
const projectDone = previewStages.find((stage) => stage.key === "done")?.tasks.length ?? 0;

const projects = [
  { name: "Spring newsletter", icon: Newspaper, area: "Writing", done: projectDone, total: projectTasks },
  { name: "Summer garden plan", icon: Sprout, area: "Garden", done: 5, total: 8 },
  { name: "Fix up the shed", icon: Wrench, area: "Home", done: 1, total: 6 },
];

const areaCounts = [
  { goals: 2, habits: 2, projects: 1 },
  { goals: 1, habits: 1, projects: 0 },
  { goals: 1, habits: 0, projects: 1 },
];

const recentAges = ["2h", "1d", "2d", "4d", "1w"];

function SectionHeading({ title, viewAll }: { title: string; viewAll?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <p className="text-sm font-semibold">{title}</p>
      {viewAll && (
        <span className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground">
          View all
          <ArrowRight className="size-3" />
        </span>
      )}
    </div>
  );
}

function RecordIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-foreground/5">
      <Icon className="size-4" />
    </span>
  );
}

function PanelHeading({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <span className="inline-flex items-center gap-1 px-1 text-xs text-muted-foreground">
        Open
        <ArrowRight className="size-3" />
      </span>
    </div>
  );
}

// home-page.tsx with home-today.tsx: greeting, Today (up next + focus), projects, areas, and the summary rail.
// The date comes from the viewer's clock, so this renders in the browser.
export default function HomeScreen() {
  const [now] = useState(() => new Date());
  const todayKey = localDateKey(now);
  const upNext = useMemo(
    () =>
      buildPreviewPlans(now)
        .filter((plan) => planDayKey(plan) >= todayKey)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .slice(0, 4),
    [now, todayKey],
  );
  const date = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now);
  const stats = [
    { label: "Active projects", value: projects.length, icon: Target },
    { label: "Areas", value: previewAreas.length, icon: CirclePile },
    { label: "Resources saved", value: previewResources.length, icon: BookOpen },
    { label: "Habit streak", value: 12, icon: Flame, unit: "days" },
  ];

  return (
    <div className="grid w-full min-w-0 gap-6 pb-6 text-foreground">
      <div className="flex min-w-0 flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid min-w-0 gap-1">
          <p className="text-sm text-muted-foreground">{date}</p>
          <p className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, Sofia.</p>
          <p className="text-sm text-muted-foreground">Make room for what matters today.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" className="min-h-10 px-3">
            <BookHeart data-icon="inline-start" />
            Open journal
          </Button>
          <Button className="min-h-10 px-3.5">
            <Timer data-icon="inline-start" />
            Find your focus
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-8">
          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Today" />
            <Card className="gap-0 py-0">
              <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="grid min-w-0 content-start gap-3 p-4 sm:p-5">
                  <PanelHeading title="Up next" />
                  <ul className="-mx-2 grid min-w-0 gap-0.5">
                    {upNext.map((plan) => {
                      const day = planDayKey(plan);
                      const isToday = day === todayKey;
                      return (
                        <li
                          key={plan.uuid}
                          className="grid min-h-11 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 py-1.5"
                        >
                          <span className="grid text-xs leading-4 tabular-nums">
                            <span className={cn(isToday ? "text-foreground" : "text-muted-foreground")}>
                              {formatPlanTime(plan)}
                            </span>
                            {!isToday && (
                              <span className="truncate text-muted-foreground">{dayGroupLabel(day, todayKey)}</span>
                            )}
                          </span>
                          <span className="truncate text-sm font-medium">{plan.title}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="grid min-w-0 content-start gap-3 p-4 sm:p-5">
                  <PanelHeading title="Focus" />
                  <p className="flex items-baseline gap-2">
                    <span className="text-2xl leading-none font-semibold tabular-nums">1h 15m</span>
                    <span className="text-xs text-muted-foreground">focused today · 3 sessions</span>
                  </p>
                  <ul className="grid gap-1.5">
                    {previewFocusTasks.map((task) => (
                      <li key={task.uuid} className="flex min-w-0 items-center gap-2 text-sm">
                        <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">{task.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Projects" viewAll />
            <Card className="gap-0 py-0">
              <ul className="divide-y">
                {projects.map((project) => {
                  const percentage = Math.round((project.done / project.total) * 100);
                  return (
                    <li key={project.name} className="flex min-w-0 items-center gap-3 px-4 py-3">
                      <RecordIcon icon={project.icon} />
                      <div className="grid min-w-0 flex-1 gap-0.5">
                        <p className="truncate text-sm font-medium">{project.name}</p>
                        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{project.area}</span>
                          <span>·</span>
                          <span className="shrink-0">
                            {project.done} of {project.total} tasks
                          </span>
                        </p>
                      </div>
                      <div className="flex w-20 shrink-0 items-center gap-2.5 sm:w-36">
                        <Progress value={percentage} className="hidden h-1 flex-1 sm:block" />
                        <span className="ml-auto w-10 text-right text-xs font-medium tabular-nums">{percentage}%</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Areas" viewAll />
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {previewAreas.slice(0, 3).map((area, index) => {
                const counts = areaCounts[index];
                return (
                  <li key={area.name} className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
                    <RecordIcon icon={area.icon} />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <p className="truncate text-sm font-medium">{area.name}</p>
                      <p className="flex min-w-0 flex-wrap gap-x-2 text-xs text-muted-foreground">
                        {[
                          [counts.goals, counts.goals === 1 ? "goal" : "goals"],
                          [counts.habits, counts.habits === 1 ? "habit" : "habits"],
                          [counts.projects, counts.projects === 1 ? "project" : "projects"],
                        ].map(([value, label]) => (
                          <span key={label}>
                            <span className="text-foreground tabular-nums">{value}</span> {label}
                          </span>
                        ))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="grid min-w-0 gap-8">
          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Overview" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3.5">
                  <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <item.icon className="size-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </p>
                  <p className="flex items-baseline gap-1 text-2xl leading-none font-semibold tracking-tight tabular-nums">
                    {item.value}
                    {item.unit && <span className="text-xs font-normal tracking-normal text-muted-foreground">{item.unit}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Everyday tools" />
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-4">
              {tools.map((tool) => (
                <span
                  key={tool.label}
                  className="flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card px-1 py-2.5 text-xs font-medium"
                >
                  <tool.icon className="size-4 text-muted-foreground" />
                  <span className="max-w-full truncate">{tool.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <SectionHeading title="Recent resources" viewAll />
            <ul className="-mx-2 grid min-w-0 gap-0.5">
              {previewResources.slice(0, 5).map((resource, index) => {
                const Icon = resourceTypeIcons[resource.types[0]] ?? BookOpen;
                return (
                  <li key={resource.title} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-sm">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{resource.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{recentAges[index]}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex min-h-11 min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5">
            <Archive className="size-4 shrink-0 text-muted-foreground" />
            <span className="grid min-w-0 flex-1">
              <span className="text-sm font-medium">View archive</span>
              <span className="truncate text-xs text-muted-foreground">2 projects · 1 area · 2 resources</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
