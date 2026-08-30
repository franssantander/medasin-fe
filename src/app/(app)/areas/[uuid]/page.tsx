import { AreaDetail } from "@/features/areas/components/area-detail";
import type { AreaTab } from "@/features/areas/components/area-detail-types";

const areaTabs: AreaTab[] = [
  "projects",
  "goals",
  "habits",
  "notes",
  "resources",
];

export default async function AreaDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const requestedTab = (await searchParams).tab;
  const initialTab = areaTabs.includes(requestedTab as AreaTab)
    ? (requestedTab as AreaTab)
    : "projects";

  return <AreaDetail initialTab={initialTab} />;
}
