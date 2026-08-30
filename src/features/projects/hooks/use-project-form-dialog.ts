import { useState } from "react";
import { useProjectMutation } from "../queries/project-query";
import type { ProjectInput, ProjectListCard } from "../type";

export function useProjectFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectListCard>();
  const createProject = useProjectMutation("create");
  const updateProject = useProjectMutation("update", editingProject?.uuid);
  const updateProjectArea = useProjectMutation(
    "updateArea",
    editingProject?.uuid,
  );

  const openCreate = () => {
    setEditingProject(undefined);
    setIsOpen(true);
  };

  const openEdit = (project: ProjectListCard) => {
    setEditingProject(project);
    setIsOpen(true);
  };

  const submit = async (input: ProjectInput) => {
    if (editingProject) {
      await updateProject.mutateAsync(input);

      const areaChanged = input.area_name ||
        input.area_uuid !== editingProject.area?.uuid;
      if (areaChanged) await updateProjectArea.mutateAsync(input);
      return;
    }

    await createProject.mutateAsync(input);
  };

  return {
    project: editingProject,
    isOpen,
    isPending:
      createProject.isPending ||
      updateProject.isPending ||
      updateProjectArea.isPending,
    openCreate,
    openEdit,
    setIsOpen,
    submit,
  };
}
