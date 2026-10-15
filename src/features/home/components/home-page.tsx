"use client";

import {
  Archive,
  ArrowRight,
  BookHeart,
  BookOpen,
  CalendarCheck,
  CirclePile,
  Feather,
  File,
  Flame,
  ImageIcon,
  KanbanSquare,
  Link2,
  NotebookPen,
  RefreshCw,
  StarCheck,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
import { HomeRecordIcon } from "@/features/home/components/home-record-icon";
import { TodayPanel } from "@/features/home/components/home-today";
import { useHomeQuery } from "@/features/home/queries/home-query";
import { cn } from "@/lib/utils";
import type {
  HomeArchives,
  HomeArea,
  HomeProject,
  HomeRecentResource,
  HomeStats,
} from "@/features/home/type";

const subscribeBrowser = () => () => {};
const serverSnapshot = () => null;
const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const browserDate = () =>
  new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

const resourceIcons: Record<HomeRecentResource["type"], LucideIcon> = {
  note: BookOpen,
  link: Link2,
  file: File,
  image: ImageIcon,
};

const utilities = [
  { label: "Board", href: "/board", icon: KanbanSquare },
  { label: "Focus", href: "/focus", icon: Timer },
  { label: "Habits", href: "/habits", icon: StarCheck },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Journal", href: "/journal", icon: BookHeart },
  { label: "Letters", href: "/letters", icon: Feather },
  { label: "Plans", href: "/plans", icon: CalendarCheck },
] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function HomeHeader({ firstName }: { firstName?: string }) {
  const date = useSyncExternalStore(subscribeBrowser, browserDate, serverSnapshot);
  const name = firstName?.trim();

  return (
    <header className="flex min-w-0 flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid min-w-0 gap-1">
        <p className="flex min-h-5 items-center text-sm text-muted-foreground">
          {date ? <span>{date}</span> : <Skeleton className="h-4 w-36" />}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
          {name ? `Welcome, ${name}.` : "Welcome to your space."}
        </h1>
        <p className="text-sm text-muted-foreground">Make room for what matters today.</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="outline"
          render={<Link href="/journal" />}
          nativeButton={false}
          role="link"
          className="min-h-10 px-3 motion-reduce:transition-none"
        >
          <BookHeart data-icon="inline-start" aria-hidden="true" />
          Open journal
        </Button>
        <Button
          render={<Link href="/focus" />}
          nativeButton={false}
          role="link"
          className="min-h-10 px-3.5 motion-reduce:transition-none"
        >
          <Timer data-icon="inline-start" aria-hidden="true" />
          Find your focus
        </Button>
      </div>
    </header>
  );
}

function SectionHeading({ id, title, href }: { id: string; title: string; href?: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <h2 id={id} className="text-sm font-semibold">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          aria-label={`View all ${title.toLowerCase()}`}
          className={cn(
            "group/view-all -my-2 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none",
            focusRing,
          )}
        >
          View all
          <ArrowRight
            className="size-3 transition-transform group-hover/view-all:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

function HomeEmpty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="grid justify-items-start gap-1 rounded-xl border border-dashed px-4 py-5">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Link
        href={href}
        className={cn(
          "mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm font-medium transition-colors hover:text-muted-foreground motion-reduce:transition-none",
          focusRing,
        )}
      >
        {action}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function OverviewStats({ stats }: { stats: HomeStats }) {
  const items = [
    { label: "Active projects", value: stats.active_projects, icon: Target },
    { label: "Areas", value: stats.areas, icon: CirclePile },
    { label: "Resources saved", value: stats.resources_saved, icon: BookOpen },
    { label: "Habit streak", value: stats.habit_streak, icon: Flame },
  ];
  return (
    <section aria-label="Overview">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-3.5">
              <dt className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </dt>
              <dd className="flex items-baseline gap-1 text-2xl leading-none font-semibold tracking-tight tabular-nums">
                {item.value}
                {item.label === "Habit streak" && (
                  <span className="text-xs font-normal tracking-normal text-muted-foreground">
                    {item.value === 1 ? "day" : "days"}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function ProjectRow({ project }: { project: HomeProject }) {
  const percentage = project.progress_percentage;
  const hasTasks = project.total_tasks > 0 && percentage !== null;
  return (
    <li
      data-home-item
      className="group/row relative flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 motion-reduce:transition-none"
    >
      <Link
        href={`/projects/${project.uuid}`}
        aria-label={`Open project ${project.name}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      />
      <HomeRecordIcon kind="project" name={project.icon} size="sm" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate text-sm font-medium" title={project.name}>
          {project.name}
        </p>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {project.area ? (
            <Link
              href={`/areas/${project.area.uuid}`}
              aria-label={`Open area ${project.area.name}`}
              className="relative z-20 min-w-0 truncate rounded-sm transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none"
            >
              {project.area.name}
            </Link>
          ) : (
            <span>Inbox</span>
          )}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {hasTasks ? `${project.completed_tasks} of ${project.total_tasks} tasks` : "No tasks yet"}
          </span>
        </p>
      </div>
      {hasTasks && (
        <div className="flex w-20 shrink-0 items-center gap-2.5 sm:w-36">
          <Progress
            value={percentage}
            aria-label={`${project.name} progress`}
            className="hidden h-1 flex-1 sm:block motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
          />
          <span className="ml-auto w-10 text-right text-xs font-medium tabular-nums">
            {percentage === 100 ? "Done" : `${percentage}%`}
          </span>
        </div>
      )}
    </li>
  );
}

function ProjectsSection({ projects }: { projects: HomeProject[] }) {
  return (
    <section aria-labelledby="home-projects" className="grid min-w-0 gap-3">
      <SectionHeading id="home-projects" title="Projects" href="/projects" />
      {projects.length ? (
        <Card className="gap-0 py-0">
          <ul className="divide-y">
            {projects.slice(0, 6).map((project) => (
              <ProjectRow key={project.uuid} project={project} />
            ))}
          </ul>
        </Card>
      ) : (
        <HomeEmpty
          title="No projects yet"
          description="Start with one idea you'd like to move forward."
          href="/projects"
          action="Go to projects"
        />
      )}
    </section>
  );
}

function AreaTile({ area }: { area: HomeArea }) {
  const counts = [
    { label: area.goals_count === 1 ? "goal" : "goals", value: area.goals_count },
    { label: area.habits_count === 1 ? "habit" : "habits", value: area.habits_count },
    { label: area.projects_count === 1 ? "project" : "projects", value: area.projects_count },
  ];
  return (
    <li
      data-home-item
      className="relative flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 motion-reduce:transition-none"
    >
      <Link
        href={`/areas/${area.uuid}`}
        aria-label={`Open area ${area.name}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <HomeRecordIcon kind="area" name={area.icon} size="sm" />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate text-sm font-medium" title={area.name}>
          {area.name}
        </p>
        <dl className="flex min-w-0 flex-wrap gap-x-2 text-xs text-muted-foreground">
          {counts.map((count) => (
            <div key={count.label} className="flex flex-row-reverse justify-end gap-1">
              <dt>{count.label}</dt>
              <dd className="tabular-nums text-foreground">{count.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </li>
  );
}

function AreasSection({ areas }: { areas: HomeArea[] }) {
  return (
    <section aria-labelledby="home-areas" className="grid min-w-0 gap-3">
      <SectionHeading id="home-areas" title="Areas" href="/areas" />
      {areas.length ? (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => (
            <AreaTile key={area.uuid} area={area} />
          ))}
        </ul>
      ) : (
        <HomeEmpty
          title="No areas yet"
          description="Give the things that matter a place of their own."
          href="/areas"
          action="Go to areas"
        />
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

function RecentResourcesSection({ resources }: { resources: HomeRecentResource[] }) {
  return (
    <section aria-labelledby="home-resources" className="grid min-w-0 gap-3">
      <SectionHeading id="home-resources" title="Recent resources" href="/resources" />
      {resources.length ? (
        <ul className="-mx-2 grid min-w-0 gap-0.5">
          {resources.slice(0, 5).map((item) => {
            const Icon = resourceIcons[item.type] ?? BookOpen;
            const age = compactAge(item.occurred_at);
            return (
              <li key={item.item_key} className="min-w-0">
                <Link
                  href={`/resources?resource=${encodeURIComponent(item.resource_uuid)}`}
                  className={cn(
                    "flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/60 motion-reduce:transition-none",
                    focusRing,
                  )}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate" title={item.title}>
                    {item.title}
                  </span>
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
        <HomeEmpty
          title="No recent resources yet"
          description="Keep a useful note, link, or inspiration close by."
          href="/resources"
          action="Browse resources"
        />
      )}
    </section>
  );
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function ArchivesLink({ archives }: { archives: HomeArchives }) {
  const total = archives.projects + archives.areas + archives.resources;
  return (
    <Link
      href="/archives"
      className={cn(
        "group/archive flex min-h-11 min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-muted/50 motion-reduce:transition-none",
        focusRing,
      )}
    >
      <Archive className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="grid min-w-0 flex-1">
        <span className="text-sm font-medium">View archive</span>
        <span className="truncate text-xs text-muted-foreground">
          {total
            ? [
                pluralize(archives.projects, "project", "projects"),
                pluralize(archives.areas, "area", "areas"),
                pluralize(archives.resources, "resource", "resources"),
              ].join(" · ")
            : "Nothing archived yet"}
        </span>
      </span>
      <ArrowRight
        className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover/archive:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}

function UtilitiesSection() {
  return (
    <section aria-labelledby="home-utilities" className="grid min-w-0 gap-3">
      <SectionHeading id="home-utilities" title="Everyday tools" />
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-4">
        {utilities.map((utility) => {
          const Icon = utility.icon;
          return (
            <Link
              key={utility.label}
              href={utility.href}
              className={cn(
                "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border bg-card px-1 py-2.5 text-xs font-medium transition-colors hover:bg-muted motion-reduce:transition-none",
                focusRing,
              )}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="max-w-full truncate">{utility.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MainSkeleton() {
  return (
    <div role="status" aria-label="Loading home" className="grid gap-6">
      {[5, 4].map((rows, section) => (
        <div key={section} className="grid gap-3">
          <Skeleton className="h-4 w-20" />
          <div className="grid gap-2">
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Loading home…</span>
    </div>
  );
}

function RailSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-2">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

export function HomeOverviewPage() {
  const timezone = useSyncExternalStore(
    subscribeBrowser,
    browserTimezone,
    serverSnapshot,
  );
  const currentUser = useCurrentUserQuery();
  const query = useHomeQuery(timezone ?? "UTC", Boolean(timezone));
  const loading = !timezone || query.isPending;
  const data = query.isError ? undefined : query.data?.data;

  return (
    <div className="home-workspace grid w-full min-w-0 gap-6 pb-6 text-foreground">
      <HomeHeader firstName={currentUser.data?.data.first_name} />
      <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-8">
          <TodayPanel timezone={timezone} />
          {loading ? (
            <MainSkeleton />
          ) : query.isError ? (
            <Card className="items-center py-10 text-center" role="alert">
              <CardHeader className="justify-items-center">
                <CardTitle>
                  <h2>Home could not be loaded</h2>
                </CardTitle>
                <CardDescription>
                  Check your connection and try again. Your everyday tools are still here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="min-h-11 px-4 motion-reduce:transition-none"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  <RefreshCw
                    data-icon="inline-start"
                    className={cn(query.isFetching && "animate-spin motion-reduce:animate-none")}
                    aria-hidden="true"
                  />
                  {query.isFetching ? "Trying again…" : "Try again"}
                </Button>
              </CardContent>
            </Card>
          ) : data ? (
            <>
              <ProjectsSection projects={data.projects} />
              <AreasSection areas={data.areas} />
            </>
          ) : null}
        </div>
        <aside aria-label="Workspace summary" className="grid min-w-0 gap-8">
          {loading ? <RailSkeleton /> : data ? <OverviewStats stats={data.stats} /> : null}
          <UtilitiesSection />
          {data && (
            <>
              <RecentResourcesSection resources={data.recent_resources} />
              <ArchivesLink archives={data.archives} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
