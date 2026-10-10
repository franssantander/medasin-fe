"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionQuery } from "../queries/subscription-query";
import { coreFeatureLabels, coreFeatures, type Subscription } from "../types";

function CoreUsage({ subscription }: { subscription: Subscription }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-3" aria-label="Core usage">
      {coreFeatures.map((feature) => {
        const usage = subscription.usage[feature];
        const limit = subscription.limits[feature];
        const overLimit = limit !== null && usage > limit;
        const atLimit = limit !== null && usage === limit;

        return (
          <div key={feature} className="flex min-w-0 flex-col gap-3 rounded-lg border p-4">
            <dt className="font-medium">{coreFeatureLabels[feature]}</dt>
            <dd className="flex flex-col gap-2">
              <span className="text-sm tabular-nums">
                {usage.toLocaleString()} of {limit === null ? "Unlimited" : limit.toLocaleString()}
              </span>
              {overLimit ? (
                <Badge variant="destructive">Over limit</Badge>
              ) : atLimit ? (
                <Badge variant="secondary">Limit reached</Badge>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function SubscriptionPanel() {
  const query = useSubscriptionQuery();
  const subscription = query.data?.data;

  return (
    <Card className="min-h-0 gap-0 py-0 md:flex-1">
      <CardHeader className="shrink-0 border-b p-5 sm:p-6">
        <CardTitle><h2>Plan &amp; usage</h2></CardTitle>
        <CardDescription>Your current plan and Core record usage.</CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 gap-6 p-5 sm:p-6 md:flex-1 md:overflow-y-auto">
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
              <Skeleton className="h-6 w-28" />
              <div className="grid gap-3 sm:grid-cols-3">
                {coreFeatures.map((feature) => <Skeleton key={feature} className="h-28 w-full" />)}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-2">
                <h3 className="font-medium">Current plan</h3>
                <Badge variant="secondary">{subscription.plan.name}</Badge>
                {subscription.grant_type === "lifetime" ? (
                  <p className="text-sm text-muted-foreground">Lifetime access</p>
                ) : subscription.expires_at ? (
                  <p className="text-sm text-muted-foreground">
                    Access until {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(subscription.expires_at))}
                  </p>
                ) : null}
              </div>
              <Button variant="outline" aria-label="Refresh usage" disabled={query.isFetching} onClick={() => void query.refetch()}>
                <RefreshCw data-icon="inline-start" aria-hidden="true" />
                {query.isFetching ? "Refreshing…" : "Refresh usage"}
              </Button>
            </div>
            {!subscription.enforcement_enabled && (
              <Alert>
                <AlertTitle>Plan enforcement is disabled</AlertTitle>
                <AlertDescription>Core usage is still tracked. Your effective limits are Unlimited while enforcement is disabled.</AlertDescription>
              </Alert>
            )}
            <CoreUsage subscription={subscription} />
            <Separator />
            <section className="flex flex-col gap-3" aria-label="How usage works">
              <h3 className="font-medium">How usage works</h3>
              <p className="text-sm text-muted-foreground">
                Projects, Areas, and Resources count toward your plan, including archived items.
                Moving an item to Trash frees a slot after deletion completes.
              </p>
              <p className="text-sm text-muted-foreground">
                You can restore items from Trash within 30 days, even if this puts you over your limit.
                Existing items remain available to view, edit, archive, and delete. New items may be blocked until usage is below the limit.
              </p>
              <p className="text-sm text-muted-foreground">
                Board, Focus, Habits, Notes, Journal, Letters, and Calendar Plans have no plan limits.
              </p>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
