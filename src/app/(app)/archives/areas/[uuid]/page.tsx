import { AreaDetail } from "@/features/areas/components/area-detail";
import type { AreaTab } from "@/features/areas/components/area-detail-types";

const areaTabs: AreaTab[] = [
  "projects",
  "goals",
  "habits",
  "notes",
  "resources",
];

export default async function ArchivedAreaDetailPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string | string[];
    note?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const requestedTab = params.tab;
  const initialTab = areaTabs.includes(requestedTab as AreaTab)
    ? (requestedTab as AreaTab)
    : "projects";
  const initialNoteUuid =
    typeof params.note === "string" ? params.note : undefined;

  return (
    <AreaDetail
      initialTab={initialTab}
      initialNoteUuid={initialNoteUuid}
      archiveRoute
    />
  );
}
