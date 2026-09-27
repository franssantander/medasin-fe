"use client";

import {
  BookOpen,
  CalendarDays,
  Feather,
  File,
  ImageIcon,
  KanbanSquare,
  Layers3,
  Link2,
  Mail,
  NotebookPen,
  RefreshCw,
  Repeat2,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import PageHeader from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery } from "@/features/home/queries/dashboard-query";
import { cn } from "@/lib/utils";
import type {
  DashboardArchives,
  DashboardArea,
  DashboardData,
  DashboardProject,
  DashboardRecentResource,
  DashboardStats,
} from "@/features/home/type";

const subscribeTimezone = () => () => {};
const serverTimezone = () => null;
const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const resourceIcons: Record<DashboardRecentResource["type"], LucideIcon> = {
  note: BookOpen,
  link: Link2,
  file: File,
  image: ImageIcon,
};

const utilities = [
  { label: "Board", href: "/board", icon: KanbanSquare },
  { label: "Focus", href: "/focus", icon: Timer },
  { label: "Habits", href: "/habits", icon: Repeat2 },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Journal", href: "/journal", icon: Feather },
  { label: "Letters", href: "/letters", icon: Mail },
  { label: "Plans", href: "/plans", icon: CalendarDays },
] as const;

function SectionHeading({
  id,
  title,
  href,
}: {
  id: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-sm font-medium">{title}</h2>
      {href && (
        <Link
          href={href}
          aria-label={`View all ${title.toLowerCase()}`}
          className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View all
        </Link>
      )}
    </div>
  );
}

function StatStrip({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Active projects", value: stats.active_projects },
    { label: "Areas", value: stats.areas },
    { label: "Resources saved", value: stats.resources_saved },
    { label: "Habit streak", value: stats.habit_streak },
  ];
  return (
    <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} size="sm" className="gap-0">
          <CardHeader className="gap-1">
            <CardDescription className="text-[11px]">{item.label}</CardDescription>
            <p className="text-[22px] leading-7 font-medium tabular-nums">
              {item.value}
            </p>
          </CardHeader>
        </Card>
      ))}
    </section>
  );
}

function ProjectPreview({ project }: { project: DashboardProject }) {
  const percentage = project.progress_percentage;
  const hasTasks = project.total_tasks > 0 && percentage !== null;
  return (
    <Card size="sm" className="min-w-0 gap-3">
      <CardHeader className="min-w-0 gap-2">
        <CardTitle className="min-w-0 truncate">
          <Link
            href={`/projects/${project.uuid}`}
            aria-label={`Open project ${project.name}`}
            className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {project.name}
          </Link>
        </CardTitle>
        {project.area ? (
          <Badge
            variant="secondary"
            className="max-w-full"
            render={
              <Link
                href={`/areas/${project.area.uuid}`}
                aria-label={`Open area ${project.area.name}`}
              />
            }
          >
            <span className="truncate">Area · {project.area.name}</span>
          </Badge>
        ) : (
          <Badge variant="outline">Inbox</Badge>
        )}
      </CardHeader>
      <CardContent className="gap-2">
        {hasTasks ? (
          <>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">
                {project.completed_tasks} of {project.total_tasks} tasks
              </span>
              <span className="font-medium tabular-nums text-primary">
                {percentage === 100 ? "Done" : `${percentage}%`}
              </span>
            </div>
            <Progress
              value={percentage}
              aria-label={`${project.name} progress`}
              className="h-1.5"
            />
          </>
        ) : (
          <p className="text-xs text-muted-foreground">No tasks yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectsSection({ projects }: { projects: DashboardProject[] }) {
  return (
    <section aria-labelledby="dashboard-projects" className="grid gap-2">
      <SectionHeading id="dashboard-projects" title="Projects" href="/projects" />
      {projects.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <ProjectPreview key={project.uuid} project={project} />
          ))}
        </div>
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              Projects and their task progress will appear here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}

function AreaPreview({ area }: { area: DashboardArea }) {
  const counts = [
    { label: "Goals", value: area.goals_count },
    { label: "Habits", value: area.habits_count },
    { label: "Projects", value: area.projects_count },
  ];
  return (
    <Card size="sm" className="min-w-0 gap-3">
      <CardHeader className="min-w-0">
        <CardTitle className="flex min-w-0 items-center gap-2">
          <Layers3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Link
            href={`/areas/${area.uuid}`}
            aria-label={`Open area ${area.name}`}
            className="min-w-0 truncate rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {area.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-2">
          {counts.map((count) => (
            <div key={count.label} className="flex min-w-0 flex-col">
              <dt className="order-2 text-[10px] text-muted-foreground">
                {count.label}
              </dt>
              <dd className="order-1 text-[15px] font-medium tabular-nums">
                {count.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function AreasSection({ areas }: { areas: DashboardArea[] }) {
  return (
    <section aria-labelledby="dashboard-areas" className="grid gap-2">
      <SectionHeading id="dashboard-areas" title="Areas" href="/areas" />
      {areas.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => (
            <AreaPreview key={area.uuid} area={area} />
          ))}
        </div>
      ) : (
        <Card size="sm">
          <CardHeader>
            <CardTitle>No areas yet</CardTitle>
            <CardDescription>
              Areas you create will appear here with their goals, habits, and projects.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}

function compactAge(value: string) {
  const date = new Date(value);
  const elapsed = Math.max(0, Date.now() - date.getTime());
  if (Number.isNaN(elapsed)) return "";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function RecentResourcesSection({
  resources,
}: {
  resources: DashboardRecentResource[];
}) {
  return (
    <section aria-labelledby="dashboard-resources" className="grid min-w-0 gap-2">
      <SectionHeading id="dashboard-resources" title="Recent resources" href="/resources" />
      <Card size="sm" className="min-w-0 py-1">
        <CardContent className="gap-0">
          {resources.length ? (
            <ul className="divide-y divide-border">
              {resources.slice(0, 5).map((item) => {
                const Icon = resourceIcons[item.type] ?? BookOpen;
                const age = compactAge(item.occurred_at);
                return (
                  <li key={item.item_key}>
                    <Link
                      href={`/resources?resource=${encodeURIComponent(item.resource_uuid)}`}
                      className="flex min-h-12 min-w-0 items-center gap-3 rounded-sm py-2 text-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      {age && (
                        <time
                          dateTime={item.occurred_at}
                          title={new Date(item.occurred_at).toLocaleString()}
                          className="shrink-0 text-xs tabular-nums text-muted-foreground"
                        >
                          {age}
                        </time>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No recent resources yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ArchivesSection({ archives }: { archives: DashboardArchives }) {
  const counts = [
    { label: "Projects", value: archives.projects },
    { label: "Areas", value: archives.areas },
    { label: "Resources", value: archives.resources },
  ];
  return (
    <section aria-labelledby="dashboard-archives" className="grid min-w-0 gap-2">
      <SectionHeading id="dashboard-archives" title="Archives" />
      <Card size="sm" className="min-w-0 gap-2">
        <CardContent>
          <dl className="grid gap-2">
            {counts.map((count) => (
              <div key={count.label} className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{count.label}</dt>
                <dd className="font-medium tabular-nums">{count.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CardFooter>
          <Link href="/archives" className={cn(buttonVariants(), "w-full")}>
            View archive
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}

function UtilitiesSection() {
  return (
    <section aria-labelledby="dashboard-utilities" className="grid gap-2">
      <SectionHeading id="dashboard-utilities" title="Utilities" />
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
        {utilities.map((utility) => {
          const Icon = utility.icon;
          return (
            <Card key={utility.label} size="sm" className="py-0">
              <CardContent className="p-0">
                <Link
                  href={utility.href}
                  className="flex min-h-18 flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                  {utility.label}
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-28" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <StatStrip stats={data.stats} />
      <ProjectsSection projects={data.projects} />
      <AreasSection areas={data.areas} />
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <RecentResourcesSection resources={data.recent_resources} />
        <ArchivesSection archives={data.archives} />
      </div>
      <UtilitiesSection />
    </div>
  );
}

export function DashboardPage() {
  const timezone = useSyncExternalStore(
    subscribeTimezone,
    browserTimezone,
    serverTimezone,
  );
  const query = useDashboardQuery(timezone ?? "UTC", Boolean(timezone));

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-5">
      <PageHeader
        title="Dashboard"
        description="A bird's-eye view of everything in motion."
      />
      {!timezone || query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <Card className="items-center py-12 text-center" role="alert">
          <CardHeader className="justify-items-center">
            <CardTitle>Dashboard could not be loaded</CardTitle>
            <CardDescription>Check your connection and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : query.data ? (
        <DashboardContent data={query.data.data} />
      ) : null}
    </div>
  );
}
