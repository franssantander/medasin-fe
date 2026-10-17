"use client";

import {
  ArchiveRestore,
  BookOpen,
  ChartNoAxesCombined,
  CircleAlert,
  CirclePile,
  HardDrive,
  Infinity as InfinityIcon,
  Layers,
  Mail,
  RefreshCw,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsPanelHeader } from "@/features/settings/components/settings-panel-header";
import { cn } from "@/lib/utils";
import { useSubscriptionQuery } from "../queries/subscription-query";
import { coreFeatureLabels, coreFeatures, type CoreFeature, type Subscription } from "../types";
import { formatBytes, upgradeContactHref } from "../utils/plan-format";
import { PlanComparison } from "./plan-comparison";
import { PlanIcon } from "./plan-icon";

const coreFeatureIcons: Record<CoreFeature, LucideIcon> = {
  projects: Target,
  areas: CirclePile,
  resources: BookOpen,
};

const usageNotes = [
  {
    icon: Layers,
    text: "Projects, Areas, and Resources count toward your plan, including archived items. Moving an item to Trash frees its slot.",
  },
  {
    icon: ArchiveRestore,
    text: "You can restore items from Trash within 30 days when your plan has room for them. Existing items remain available to view, edit, archive, and delete, even over your limit; new items are blocked until usage is below it.",
  },
  {
    icon: HardDrive,
    text: "Storage counts files in Resources, Notes, and Letters. Files in Trash still count until they are permanently deleted.",
  },
  {
    icon: InfinityIcon,
    text: "Board, Focus, Habits, Notes, Journal, Letters, and Calendar Plans are included on every plan.",
  },
];

function UsageCard({ feature, subscription }: { feature: CoreFeature; subscription: Subscription }) {
  const Icon = coreFeatureIcons[feature];
  const usage = subscription.usage[feature];
  const limit = subscription.limits[feature];
  const overLimit = limit !== null && usage > limit;
  const atLimit = limit !== null && usage === limit;
  const percent = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, (usage / limit) * 100);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-4",
        overLimit && "border-destructive/40 bg-destructive/5",
      )}
    >
      <dt className="flex items-center gap-2 font-medium">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{coreFeatureLabels[feature]}</span>
      </dt>
      <dd className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-semibold tabular-nums">
            {usage.toLocaleString()} of {limit === null ? "Unlimited" : limit.toLocaleString()}
          </span>
          {overLimit ? (
            <Badge variant="destructive">Over limit</Badge>
          ) : atLimit ? (
            <Badge variant="secondary">Limit reached</Badge>
          ) : null}
        </div>
        {limit === null ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfinityIcon className="size-3.5" aria-hidden="true" />
            No cap on your plan
          </span>
        ) : (
          <>
            <Progress
              value={percent}
              aria-label={`${coreFeatureLabels[feature]} usage`}
              className={cn(
                "h-1.5",
                overLimit && "[&_[data-slot=progress-indicator]]:bg-destructive [&_[data-slot=progress-track]]:bg-destructive/15",
                atLimit && "[&_[data-slot=progress-indicator]]:bg-amber-500 [&_[data-slot=progress-track]]:bg-amber-500/15",
              )}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {overLimit
                ? `${(usage - limit).toLocaleString()} above your plan`
                : atLimit
                  ? "No slots left"
                  : `${(limit - usage).toLocaleString()} left`}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

function StorageCard({ subscription }: { subscription: Subscription }) {
  const usage = subscription.usage.storage_bytes;
  const limit = subscription.limits.storage_bytes;
  const overLimit = limit !== null && usage > limit;
  const full = limit !== null && usage === limit;
  const percent = limit === null ? 0 : limit === 0 ? 100 : Math.min(100, (usage / limit) * 100);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-4",
        overLimit && "border-destructive/40 bg-destructive/5",
      )}
    >
      <dt className="flex items-center gap-2 font-medium">
        <HardDrive className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">Storage</span>
      </dt>
      <dd className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-lg font-semibold tabular-nums">
            {formatBytes(usage)} of {limit === null ? "Unlimited" : formatBytes(limit)}
          </span>
          {overLimit ? (
            <Badge variant="destructive">Over limit</Badge>
          ) : full ? (
            <Badge variant="secondary">Full</Badge>
          ) : null}
        </div>
        {limit === null ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <InfinityIcon className="size-3.5" aria-hidden="true" />
            No cap on your plan
          </span>
        ) : (
          <>
            <Progress
              value={percent}
              aria-label="Storage usage"
              className={cn(
                "h-1.5",
                overLimit && "[&_[data-slot=progress-indicator]]:bg-destructive [&_[data-slot=progress-track]]:bg-destructive/15",
                full && "[&_[data-slot=progress-indicator]]:bg-amber-500 [&_[data-slot=progress-track]]:bg-amber-500/15",
              )}
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {overLimit
                ? `${formatBytes(usage - limit)} above your plan`
                : full
                  ? "No space left"
                  : `${formatBytes(limit - usage)} left`}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

function PlanSummary({
  subscription,
  isFetching,
  onRefresh,
}: {
  subscription: Subscription;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-linear-to-br from-muted/80 via-card to-card p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-4">
        <PlanIcon slug={subscription.plan.slug} className="size-12 rounded-xl [&_svg]:size-5" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-xs font-medium text-muted-foreground">Current plan</h3>
          <p className="truncate text-xl font-semibold">{subscription.plan.name}</p>
          {subscription.expires_at ? (
            <p className="text-sm text-muted-foreground">
              Access until {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(subscription.expires_at))}
            </p>
          ) : null}
        </div>
      </div>
      <Button variant="outline" aria-label="Refresh usage" disabled={isFetching} onClick={onRefresh}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" className={cn(isFetching && "motion-safe:animate-spin")} />
        {isFetching ? "Refreshing…" : "Refresh usage"}
      </Button>
    </div>
  );
}

function ComparePlans({ currentSlug }: { currentSlug: string }) {
  const contact = upgradeContactHref();

  return (
    <section id="compare" className="flex scroll-mt-4 flex-col gap-3" aria-labelledby="compare-plans-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="compare-plans-title" className="font-medium">Compare plans</h3>
          <p className="text-sm text-muted-foreground">
            Every plan includes every tool. Plans differ in how many Core items and how much storage they allow.
          </p>
        </div>
        {contact && (
          <a href={contact} className={buttonVariants({ variant: "outline" })}>
            <Mail data-icon="inline-start" aria-hidden="true" />
            Contact us to upgrade
          </a>
        )}
      </div>
      <PlanComparison currentSlug={currentSlug} />
    </section>
  );
}

export function SubscriptionPanel() {
  const query = useSubscriptionQuery();
  const subscription = query.data?.data;

  return (
    <Card className="min-h-0 gap-0 py-0 md:flex-1">
      <SettingsPanelHeader
        icon={ChartNoAxesCombined}
        title="Plan & usage"
        description="Your current plan, usage, and available plans."
      />
      <CardContent className="@container min-h-0 gap-6 p-5 sm:p-6 md:flex-1 md:overflow-y-auto">
        {!subscription ? (
          query.isError ? (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Plan information could not be loaded</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                <span>{query.error.message}</span>
                <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-4" role="status" aria-label="Loading plan and usage">
              <Skeleton className="h-22 w-full rounded-xl" />
              <div className="grid gap-3 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-4">
                {[...coreFeatures, "storage"].map((key) => <Skeleton key={key} className="h-28 w-full rounded-xl" />)}
              </div>
              <Skeleton className="h-20 w-full" />
            </div>
          )
        ) : (
          <>
            {query.isRefetchError && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>Usage may be out of date</AlertTitle>
                <AlertDescription>
                  Your last loaded plan is shown. {query.error.message} Refresh to try again.
                </AlertDescription>
              </Alert>
            )}
            <PlanSummary
              subscription={subscription}
              isFetching={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
            {!subscription.enforcement_enabled && (
              <Alert>
                <AlertTitle>Plan enforcement is disabled</AlertTitle>
                <AlertDescription>Core usage is still tracked. Your effective limits are Unlimited while enforcement is disabled.</AlertDescription>
              </Alert>
            )}
            <section className="flex flex-col gap-3">
              <h3 className="font-medium">Usage</h3>
              <dl className="grid gap-3 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-4" aria-label="Plan usage">
                {coreFeatures.map((feature) => (
                  <UsageCard key={feature} feature={feature} subscription={subscription} />
                ))}
                <StorageCard subscription={subscription} />
              </dl>
            </section>
            <Separator />
            <section className="flex flex-col gap-3" aria-label="How usage works">
              <h3 className="font-medium">How usage works</h3>
              <ul className="flex flex-col gap-3">
                {usageNotes.map((note) => (
                  <li key={note.text} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                    >
                      <note.icon className="size-4" />
                    </span>
                    <p className="pt-1.5 text-sm text-muted-foreground">{note.text}</p>
                  </li>
                ))}
              </ul>
            </section>
            <Separator />
            <ComparePlans currentSlug={subscription.plan.slug} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
