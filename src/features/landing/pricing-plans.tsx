"use client";

import { Check, CircleAlert } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanCatalogQuery } from "@/features/subscription/queries/plan-catalog-query";
import { coreFeatureLabels, coreFeatures, type CatalogPlan } from "@/features/subscription/types";
import { formatBytes, formatPlanPrice, upgradeContactHref } from "@/features/subscription/utils/plan-format";
import { cn } from "@/lib/utils";
import * as m from "motion/react-m";
import { Reveal, RevealGroup } from "./motion/reveal";
import { fadeUp } from "./motion/tokens";

function PlanAction({ plan }: { plan: CatalogPlan }) {
  if (plan.price_minor === 0) {
    return (
      <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
        Get started free
      </Link>
    );
  }

  const contact = upgradeContactHref(plan.name);
  return contact ? (
    <a href={contact} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
      Contact us to upgrade
    </a>
  ) : (
    <p className="flex h-10 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      Paid plans are coming soon.
    </p>
  );
}

function formatLimit(limit: number | null, format: (value: number) => string = (value) => value.toLocaleString("en")) {
  return limit === null ? "Unlimited" : format(limit);
}

const limitRows: { label: string; value: (plan: CatalogPlan) => string }[] = [
  ...coreFeatures.map((feature) => ({
    label: coreFeatureLabels[feature],
    value: (plan: CatalogPlan) => formatLimit(plan.limits[feature]),
  })),
  {
    label: "Storage",
    value: (plan) => formatLimit(plan.limits.storage_mb, (mb) => formatBytes(mb * 1024 * 1024)),
  },
];

function LimitsTable({ plans }: { plans: CatalogPlan[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">Plan limits</caption>
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
              Limits
            </th>
            {plans.map((plan) => (
              <th key={plan.uuid} scope="col" className="px-4 py-3 text-right font-semibold">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {limitRows.map((row) => (
            <tr key={row.label} className="border-b last:border-b-0">
              <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
                {row.label}
              </th>
              {plans.map((plan) => (
                <td key={plan.uuid} className="px-4 py-3 text-right tabular-nums">
                  {row.value(plan)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="px-4 py-3 text-left font-normal text-muted-foreground">
              Board, Focus, Habits, Notes, Journal, Letters, Plans
            </th>
            {plans.map((plan) => (
              <td key={plan.uuid} className="px-4 py-3 text-right">
                <Check className="ml-auto size-4" aria-label="Included" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function PricingPlans() {
  const query = usePlanCatalogQuery();
  const plans = query.data?.data;

  if (!plans) {
    return query.isError ? (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Plans could not be loaded</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{query.error.message}</span>
          <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    ) : (
      <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="Loading plans">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-96 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <RevealGroup as="ul" className="grid gap-4 md:grid-cols-3" aria-label="Plans">
        {plans.map((plan) => (
          <m.li
            key={plan.uuid}
            aria-label={plan.name}
            variants={fadeUp}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex min-w-0 flex-col gap-6 rounded-xl border bg-card p-6 transition-shadow duration-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-3">
              <h3 className="font-spectral text-2xl font-semibold">{plan.name}</h3>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatPlanPrice(plan)}</p>
              <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
            </div>
            <PlanAction plan={plan} />
            <ul className="flex flex-1 flex-col gap-2.5 border-t pt-5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </m.li>
        ))}
      </RevealGroup>
      <Reveal>
        <LimitsTable plans={plans} />
      </Reveal>
    </div>
  );
}
