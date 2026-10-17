"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { PlanComparison } from "@/features/subscription/components/plan-comparison";
import type { CatalogPlan } from "@/features/subscription/types";
import { upgradeContactHref } from "@/features/subscription/utils/plan-format";
import { cn } from "@/lib/utils";

function PlanAction({ plan }: { plan: CatalogPlan }) {
  if (plan.price_minor === 0) {
    return (
      <Link href="/register" className={cn(buttonVariants(), "w-full")}>
        Get started free
      </Link>
    );
  }

  const contact = upgradeContactHref(plan.name);
  return contact ? (
    <a href={contact} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
      Contact us to upgrade
    </a>
  ) : (
    <p className="text-center text-sm text-muted-foreground">Paid plans are coming soon.</p>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-14 border-t py-20 sm:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id="pricing-title" className="font-spectral text-3xl font-bold tracking-tight sm:text-4xl">
            Simple pricing
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            Every plan includes every Medasin tool. Paid plans give you more room for projects, areas, resources, and
            files.
          </p>
        </div>
        <PlanComparison renderAction={(plan) => <PlanAction plan={plan} />} />
      </div>
    </section>
  );
}
