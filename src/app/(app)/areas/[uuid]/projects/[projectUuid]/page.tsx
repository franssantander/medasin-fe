import { ProjectDetail } from "@/features/projects/components/project-detail";

export default async function AreaProjectDetailPage({
  params,
}: {
  params: Promise<{ uuid: string; projectUuid: string }>;
}) {
  const { uuid: areaUuid, projectUuid } = await params;

  return (
    <ProjectDetail
      projectUuid={projectUuid}
      routeContext="areas"
      sourceAreaUuid={areaUuid}
    />
  );
}
