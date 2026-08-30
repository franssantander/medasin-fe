import { AreaArchives } from "@/features/areas/components/area-archives";
import { ProjectArchives } from "@/features/projects/components/project-archives";

export default function ArchivesPage() {
  return (
    <div className="grid gap-8">
      <AreaArchives />
      <ProjectArchives />
    </div>
  );
}
