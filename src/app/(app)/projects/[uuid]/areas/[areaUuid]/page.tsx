import { AreaDetail } from "@/features/areas/components/area-detail";
import type { AreaTab } from "@/features/areas/components/area-detail-types";

const areaTabs: AreaTab[] = [
  "projects",
  "goals",
  "habits",
  "notes",
  "resources",
];

export default async function ProjectDetailAreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string; areaUuid: string }>;
  searchParams: Promise<{
    tab?: string | string[];
    note?: string | string[];
  }>;
}) {
  const [{ uuid: projectUuid, areaUuid }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const requestedTab = query.tab;
  const initialTab = areaTabs.includes(requestedTab as AreaTab)
    ? (requestedTab as AreaTab)
    : "projects";
  const initialNoteUuid =
    typeof query.note === "string" ? query.note : undefined;

  return (
    <AreaDetail
      initialTab={initialTab}
      initialNoteUuid={initialNoteUuid}
      routeContext="projects"
      areaUuid={areaUuid}
      sourceProjectUuid={projectUuid}
    />
  );
}
