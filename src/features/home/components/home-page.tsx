"use client";

import {
  Archive,
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
  Leaf,
  Link2,
  NotebookPen,
  RefreshCw,
  StarCheck,
  Target,
  Timer,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";

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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserQuery } from "@/features/auth/queries/auth-query";
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

function HomeWelcome({ firstName }: { firstName?: string }) {
  const date = useSyncExternalStore(subscribeBrowser, browserDate, serverSnapshot);
  const name = firstName?.trim();

  return (
    <header className="relative flex min-w-0 items-center justify-between gap-6 overflow-hidden rounded-3xl border border-border/70 bg-secondary px-6 py-7 sm:px-9 sm:py-8">
      <div className="relative z-10 min-w-0 flex-1">
        <div className="mb-4 flex min-h-8 items-center gap-3 text-xs text-muted-foreground">
          <span
            className="home-welcome-mark grid size-8 shrink-0 place-items-center rounded-full sm:hidden"
            aria-hidden="true"
          >
            <Image
              src="/images/medasin-leaf.svg"
              alt=""
              width={24}
              height={24}
            />
          </span>
          <span className="font-semibold tracking-[0.14em] uppercase">Home</span>
          <span aria-hidden="true">/</span>
          {date ? (
            <span>{date}</span>
          ) : (
            <Skeleton className="h-4 w-36" />
          )}
        </div>
        <h1 className="font-garamond text-4xl leading-[1.1] tracking-tight [overflow-wrap:anywhere] sm:text-5xl xl:text-[3.5rem]">
          {name ? (
            <>Welcome, <span className="text-primary italic">{name}.</span></>
          ) : (
            "Welcome to your space."
          )}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
          Make room for what matters today.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            render={<Link href="/focus" />}
            nativeButton={false}
            role="link"
            className="min-h-11 rounded-full px-4 motion-reduce:transition-none"
          >
            <Timer data-icon="inline-start" aria-hidden="true" />
            Find your focus
          </Button>
          <Button
            variant="ghost"
            render={<Link href="/journal" />}
            nativeButton={false}
            role="link"
            className="min-h-11 rounded-full px-3 motion-reduce:transition-none"
          >
            Open journal
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div
        className="home-welcome-art pointer-events-none relative hidden size-44 shrink-0 place-items-center sm:grid xl:size-52"
        aria-hidden="true"
      >
        <Image
          src="/images/medasin-leaf.svg"
          alt=""
          width={144}
          height={144}
          className="relative z-10 size-32 xl:size-36"
          loading="eager"
        />
        <Leaf className="absolute top-1 right-4 size-5 -rotate-12 text-primary" />
      </div>
    </header>
  );
}

function SectionHeading({
  id,
  title,
  description,
  href,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <div className="grid min-w-0 gap-1">
        <h2 id={id} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-xs leading-5 text-muted-foreground">{description}</p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`View all ${title.toLowerCase()}`}
          className="group/view-all inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          View all
          <ArrowRight
            className="size-3.5 transition-transform group-hover/view-all:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}

function HomeEmpty({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Card size="sm" className="rounded-2xl py-0">
      <Empty className="min-h-52 px-6 py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            <h3>{title}</h3>
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11 rounded-full px-4 motion-reduce:transition-none")}
          >
            {action}
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </EmptyContent>
      </Empty>
    </Card>
  );
}

function StatCards({ stats }: { stats: HomeStats }) {
  const items = [
    { label: "Active projects", value: stats.active_projects, icon: Target },
    { label: "Areas", value: stats.areas, icon: CirclePile },
    { label: "Resources saved", value: stats.resources_saved, icon: BookOpen },
    { label: "Habit streak", value: stats.habit_streak, icon: Flame },
  ];
  return (
    <section aria-label="Overview">
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              size="sm"
              className="min-h-36 min-w-0 gap-3 rounded-2xl py-5"
            >
              <dt>
                <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 sm:px-5">
                  <CardDescription className="min-w-0 text-pretty">
                    {item.label}
                  </CardDescription>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </CardHeader>
              </dt>
              <dd className="mt-auto">
                <CardContent className="px-4 sm:px-5">
                  <span className="flex items-baseline gap-1.5 text-3xl leading-none font-semibold tracking-tight tabular-nums">
                    {item.value}
                    {item.label === "Habit streak" && (
                      <span className="text-xs font-normal tracking-normal text-muted-foreground">
                        {item.value === 1 ? "day" : "days"}
                      </span>
                    )}
                  </span>
                </CardContent>
              </dd>
            </Card>
          );
        })}
      </dl>
    </section>
  );
}

function ProjectPreview({ project }: { project: HomeProject }) {
  const percentage = project.progress_percentage;
  const hasTasks = project.total_tasks > 0 && percentage !== null;
  return (
    <Card
      size="sm"
      className="group/preview relative min-h-48 min-w-0 gap-4 overflow-visible rounded-2xl py-5 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none"
    >
      <Link
        href={`/projects/${project.uuid}`}
        aria-label={`Open project ${project.name}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <CardHeader className="pointer-events-none min-w-0 grid-cols-1 gap-3 px-5">
        <div className="flex min-w-0 items-start gap-3">
          <HomeRecordIcon kind="project" name={project.icon} />
          <h3
            className="line-clamp-2 min-w-0 flex-1 pt-0.5 text-[15px] leading-5 font-semibold [overflow-wrap:anywhere]"
            title={project.name}
          >
            {project.name}
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover/preview:text-primary group-focus-within/preview:text-primary motion-reduce:transition-none"
            aria-hidden="true"
          />
        </div>
        {project.area ? (
          <Link
            href={`/areas/${project.area.uuid}`}
            aria-label={`Open area ${project.area.name}`}
            className="pointer-events-auto relative z-20 -my-2 flex min-h-11 w-fit min-w-0 max-w-full items-center self-start rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Badge variant="secondary" className="max-w-full">
              <span className="truncate">Area · {project.area.name}</span>
            </Badge>
          </Link>
        ) : (
          <Badge variant="outline" className="my-1 self-start">
            Inbox
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pointer-events-none mt-auto min-h-9 gap-2.5 px-5">
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
              className="h-1.5 motion-reduce:[&_[data-slot=progress-indicator]]:transition-none"
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
    <section aria-labelledby="home-projects" className="grid min-w-0 gap-4">
      <SectionHeading
        id="home-projects"
        title="Projects"
        description="Pick up where you left off."
        href="/projects"
      />
      {projects.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.slice(0, 6).map((project) => (
            <ProjectPreview key={project.uuid} project={project} />
          ))}
        </div>
      ) : (
        <HomeEmpty
          icon={Target}
          title="No projects yet"
          description="Start with one idea you'd like to move forward."
          href="/projects"
          action="Go to projects"
        />
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
      className="group/preview relative min-h-36 min-w-0 gap-4 overflow-visible rounded-2xl py-4 transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none"
    >
      <Link
        href={`/areas/${area.uuid}`}
        aria-label={`Open area ${area.name}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <CardHeader className="pointer-events-none min-w-0">
        <div className="flex min-w-0 items-start gap-3">
          <HomeRecordIcon kind="area" name={area.icon} />
          <h3
            className="line-clamp-2 min-w-0 flex-1 pt-0.5 text-sm leading-5 font-semibold [overflow-wrap:anywhere]"
            title={area.name}
          >
            {area.name}
          </h3>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover/preview:text-primary group-focus-within/preview:text-primary motion-reduce:transition-none"
            aria-hidden="true"
          />
        </div>
      </CardHeader>
      <CardContent className="pointer-events-none mt-auto">
        <dl className="grid grid-cols-3 border-t border-border/80 pt-3">
          {counts.map((count) => (
            <div key={count.label} className="flex min-w-0 flex-col items-center justify-center gap-0.5 border-r border-border/70 px-1 text-center last:border-r-0">
              <dt className="order-2 text-xs leading-4 text-muted-foreground">
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
    <section aria-labelledby="home-areas" className="grid min-w-0 gap-4">
      <SectionHeading
        id="home-areas"
        title="Areas"
        description="Care for the different parts of your life."
        href="/areas"
      />
      {areas.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map((area) => (
            <AreaPreview key={area.uuid} area={area} />
          ))}
        </div>
      ) : (
        <HomeEmpty
          icon={Leaf}
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

function RecentResourcesSection({
  resources,
}: {
  resources: HomeRecentResource[];
}) {
  return (
    <section aria-labelledby="home-resources" className="grid min-w-0 gap-4">
      <SectionHeading
        id="home-resources"
        title="Recent resources"
        description="Good things to keep close."
        href="/resources"
      />
      {resources.length ? (
        <Card size="sm" className="min-w-0 gap-0 rounded-2xl py-2">
          <CardContent className="gap-0">
            <ul className="divide-y divide-border/70">
              {resources.slice(0, 5).map((item) => {
                const Icon = resourceIcons[item.type] ?? BookOpen;
                const age = compactAge(item.occurred_at);
                return (
                  <li key={item.item_key}>
                    <Link
                      href={`/resources?resource=${encodeURIComponent(item.resource_uuid)}`}
                      className="group/resource -mx-2 flex min-h-16 min-w-0 items-center gap-3 rounded-xl px-2 py-3 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium" title={item.title}>
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
          </CardContent>
        </Card>
      ) : (
        <HomeEmpty
          icon={BookOpen}
          title="No recent resources yet"
          description="Keep a useful note, link, or inspiration close by."
          href="/resources"
          action="Browse resources"
        />
      )}
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
    <section aria-labelledby="home-archives" className="grid min-w-0 gap-4">
      <SectionHeading
        id="home-archives"
        title="Archives"
        description="Your past work, within reach."
      />
      <Card size="sm" className="min-w-0 gap-0 rounded-2xl py-0">
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
        <Separator />
        <CardFooter className="py-1">
          <Link
            href="/archives"
            className={cn(buttonVariants({ variant: "ghost" }), "min-h-11 w-full justify-between px-0 motion-reduce:transition-none")}
          >
            <span className="flex items-center gap-2">
              <Archive aria-hidden="true" />
              View archive
            </span>
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}

function UtilitiesSection() {
  return (
    <section aria-labelledby="home-utilities" className="grid min-w-0 gap-3">
      <SectionHeading id="home-utilities" title="Everyday tools" />
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-card p-2 min-[480px]:grid-cols-3 sm:grid-cols-4 xl:grid-cols-7">
        {utilities.map((utility) => {
          const Icon = utility.icon;
          return (
            <Link
              key={utility.label}
              href={utility.href}
              className="group/utility flex min-h-14 min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {utility.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading home" className="grid gap-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card
            key={item}
            size="sm"
            className="min-h-36 min-w-0 gap-3 rounded-2xl py-5"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 sm:px-5">
              <Skeleton className="h-4 w-24 min-w-0 max-w-full" />
              <Skeleton className="size-8 shrink-0 rounded-lg" />
            </CardHeader>
            <CardContent className="mt-auto px-4 sm:px-5">
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-36 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="grid content-start gap-8">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading home…</span>
    </div>
  );
}

function HomeContent({ data }: { data: HomeData }) {
  return (
    <div className="grid min-w-0 gap-8">
      <StatCards stats={data.stats} />
      <ProjectsSection projects={data.projects} />
      <div className="grid min-w-0 items-start gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AreasSection areas={data.areas} />
        <div className="grid min-w-0 gap-8">
          <RecentResourcesSection resources={data.recent_resources} />
          <ArchivesSection archives={data.archives} />
        </div>
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

  return (
    <div className="home-workspace grid w-full min-w-0 gap-8 pb-6 text-foreground">
      <HomeWelcome firstName={currentUser.data?.data.first_name} />
      <UtilitiesSection />
      {!timezone || query.isPending ? (
        <HomeSkeleton />
      ) : query.isError ? (
        <Card className="items-center rounded-2xl py-10 text-center" role="alert">
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
              className="min-h-11 rounded-full px-4 motion-reduce:transition-none"
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
      ) : query.data ? (
        <HomeContent data={query.data.data} />
      ) : null}
    </div>
  );
}
