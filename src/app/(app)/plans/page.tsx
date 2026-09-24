import type { Metadata } from "next";
import { PlansPage } from "@/features/plans/components/plans-page";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansRoute({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const params = await searchParams;
  return <PlansPage initialPlanUuid={typeof params.plan === "string" ? params.plan : undefined} />;
}
