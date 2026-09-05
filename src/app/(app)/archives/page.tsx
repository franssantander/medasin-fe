import { AreaArchives } from "@/features/areas/components/area-archives";
import { ProjectArchives } from "@/features/projects/components/project-archives";
import { ResourceArchives } from "@/features/resources/components/resource-archives";

export default function ArchivesPage() {
  return (
    <div className="grid gap-10">
      <AreaArchives />
      <div className="border-t pt-8">
        <ProjectArchives />
      </div>
      <div className="border-t pt-8">
        <ResourceArchives />
      </div>
    </div>
  );
}
