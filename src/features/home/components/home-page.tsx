"use client";

import {
  ArrowRight,
  ArrowUpRight,
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
import { HomeRecordIcon } from "@/features/home/components/home-record-icon";
import { useHomeQuery } from "@/features/home/queries/home-query";
import { cn } from "@/lib/utils";
import type {
  HomeArchives,
  HomeArea,
  HomeData,
  HomeProject,
  HomeRecentResource,
  HomeStats,
} from "@/features/home/type";

const subscribeTimezone = () => () => {};
const serverTimezone = () => null;
const browserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

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
    <div className="flex items-center justify-between gap-3 pb-1">
      <h2 id={id} className="text-base font-semibold tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          aria-label={`View all ${title.toLowerCase()}`}
          className="group/view-all -my-1.5 inline-flex min-h-11 items-center gap-1 rounded-sm px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          View all
          <ArrowRight
            className="size-3.5 transition-transform group-hover/view-all:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

function StatStrip({ stats }: { stats: HomeStats }) {
  const items = [
    { label: "Active projects", value: stats.active_projects, icon: Target },
    { label: "Areas", value: stats.areas, icon: CirclePile },
    { label: "Resources saved", value: stats.resources_saved, icon: BookOpen },
    { label: "Habit streak", value: stats.habit_streak, icon: Flame },
  ];
  return (
    <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} size="sm" className="min-h-30 gap-0 py-0">
            <CardHeader className="grid flex-1 grid-rows-[auto_1fr] gap-3 py-4">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <CardDescription className="min-w-0 pt-1 text-xs font-medium leading-4">
                  {item.label}
                </CardDescription>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ring-1 ring-foreground/5">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
              </div>
              <p className="self-end text-3xl leading-none font-semibold tracking-tight tabular-nums">
                {item.value}
              </p>
            </CardHeader>
          </Card>
        );
      })}
    </section>
  );
}

function ProjectPreview({ project }: { project: HomeProject }) {
  const percentage = project.progress_percentage;
  const hasTasks = project.total_tasks > 0 && percentage !== null;
  return (
    <Card
      size="sm"
      className="group/preview relative min-h-44 min-w-0 gap-0 overflow-visible py-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <Link
        href={`/projects/${project.uuid}`}
        aria-label={`Open project ${project.name}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <CardHeader className="pointer-events-none min-w-0 gap-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <HomeRecordIcon kind="project" name={project.icon} />
          <h3
            className="min-w-0 flex-1 truncate pt-0.5 text-[15px] leading-5 font-semibold"
            title={project.name}
          >
            {project.name}
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/preview:text-foreground group-focus-within/preview:text-foreground"
            aria-hidden="true"
          />
        </div>
        {project.area ? (
          <Badge
            variant="secondary"
            className="pointer-events-auto relative z-20 max-w-full self-start"
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
          <Badge variant="outline" className="self-start">
            Inbox
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pointer-events-none mt-auto min-h-18 gap-2.5 border-t border-border/70 bg-muted/20 py-3">
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

function ProjectsSection({ projects }: { projects: HomeProject[] }) {
  return (
    <section aria-labelledby="home-projects" className="grid gap-3">
      <SectionHeading id="home-projects" title="Projects" href="/projects" />
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

function AreaPreview({ area }: { area: HomeArea }) {
  const counts = [
    { label: "Goals", value: area.goals_count },
    { label: "Habits", value: area.habits_count },
    { label: "Projects", value: area.projects_count },
  ];
  return (
    <Card
      size="sm"
      className="group/preview relative min-h-40 min-w-0 gap-0 overflow-visible py-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      <Link
        href={`/areas/${area.uuid}`}
        aria-label={`Open area ${area.name}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <CardHeader className="pointer-events-none min-w-0 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <HomeRecordIcon kind="area" name={area.icon} />
          <h3
            className="min-w-0 flex-1 truncate pt-0.5 text-[15px] leading-5 font-semibold"
            title={area.name}
          >
            {area.name}
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/preview:text-foreground group-focus-within/preview:text-foreground"
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      <CardContent className="pointer-events-none mt-auto border-t border-border/70 bg-muted/20 py-3">
        <dl className="grid grid-cols-3">
          {counts.map((count) => (
            <div key={count.label} className="flex min-w-0 flex-col items-center justify-center gap-0.5 border-r border-border/70 px-1 text-center last:border-r-0">
              <dt className="order-2 text-[11px] leading-4 text-muted-foreground">
                {count.label}
              </dt>
              <dd className="order-1 text-lg leading-5 font-semibold tabular-nums">
                {count.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function AreasSection({ areas }: { areas: HomeArea[] }) {
  return (
    <section aria-labelledby="home-areas" className="grid gap-3">
      <SectionHeading id="home-areas" title="Areas" href="/areas" />
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
  resources: HomeRecentResource[];
}) {
  return (
    <section aria-labelledby="home-resources" className="grid min-w-0 gap-3">
      <SectionHeading id="home-resources" title="Recent resources" href="/resources" />
      <Card size="sm" className="min-w-0 gap-0 py-2">
        <CardContent className="gap-0">
          {resources.length ? (
            <ul className="divide-y divide-border/70">
              {resources.slice(0, 5).map((item) => {
                const Icon = resourceIcons[item.type] ?? BookOpen;
                const age = compactAge(item.occurred_at);
                return (
                  <li key={item.item_key}>
                    <Link
                      href={`/resources?resource=${encodeURIComponent(item.resource_uuid)}`}
                      className="group/resource -mx-2 flex min-h-14 min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/5 transition-colors group-hover/resource:text-foreground">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium group-hover/resource:text-foreground">{item.title}</span>
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
            <p className="py-7 text-center text-sm text-muted-foreground">
              No recent resources yet.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ArchivesSection({ archives }: { archives: HomeArchives }) {
  const counts = [
    { label: "Projects", value: archives.projects },
    { label: "Areas", value: archives.areas },
    { label: "Resources", value: archives.resources },
  ];
  return (
    <section aria-labelledby="home-archives" className="grid min-w-0 gap-3">
      <SectionHeading id="home-archives" title="Archives" />
      <Card size="sm" className="min-w-0 gap-0 py-0">
        <CardContent className="py-5">
          <dl className="grid grid-cols-3">
            {counts.map((count) => (
              <div key={count.label} className="flex min-w-0 flex-col items-center justify-center gap-1 border-r border-border/70 px-1 text-center last:border-r-0">
                <dt className="order-2 text-xs text-muted-foreground">{count.label}</dt>
                <dd className="order-1 text-xl leading-6 font-semibold tabular-nums">{count.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CardFooter className="border-t border-border/70 py-4">
          <Link href="/archives" className={cn(buttonVariants(), "min-h-11 w-full")}>
            View archive
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}

function UtilitiesSection() {
  return (
    <section aria-labelledby="home-utilities" className="grid gap-3">
      <SectionHeading id="home-utilities" title="Utilities" />
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
        {utilities.map((utility) => {
          const Icon = utility.icon;
          return (
            <Card
              key={utility.label}
              size="sm"
              className="group/utility overflow-visible py-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
            >
              <CardContent className="p-0">
                <Link
                  href={utility.href}
                  className="flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-xl px-2 py-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/5 transition-colors group-hover/utility:bg-primary/10 group-hover/utility:text-primary group-focus-within/utility:bg-primary/10 group-focus-within/utility:text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
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

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading home" className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-30 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-28" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-44 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-5 w-20" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-5 w-24" />
      <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
        {[1, 2, 3, 4, 5, 6, 7].map((item) => (
          <Skeleton key={item} className="h-24 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Loading home…</span>
    </div>
  );
}

function HomeContent({ data }: { data: HomeData }) {
  return (
    <div className="grid gap-6">
      <StatStrip stats={data.stats} />
      <ProjectsSection projects={data.projects} />
      <AreasSection areas={data.areas} />
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <RecentResourcesSection resources={data.recent_resources} />
        <ArchivesSection archives={data.archives} />
      </div>
      <UtilitiesSection />
    </div>
  );
}

export function HomeOverviewPage() {
  const timezone = useSyncExternalStore(
    subscribeTimezone,
    browserTimezone,
    serverTimezone,
  );
  const query = useHomeQuery(timezone ?? "UTC", Boolean(timezone));

  return (
    <div className="mx-auto grid w-full max-w-[110rem] gap-6">
      <PageHeader
        title="Home"
        description="A bird's-eye view of everything in motion."
      />
      {!timezone || query.isPending ? (
        <HomeSkeleton />
      ) : query.isError ? (
        <Card className="items-center py-12 text-center" role="alert">
          <CardHeader className="justify-items-center">
            <CardTitle>Home could not be loaded</CardTitle>
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
        <HomeContent data={query.data.data} />
      ) : null}
    </div>
  );
}
