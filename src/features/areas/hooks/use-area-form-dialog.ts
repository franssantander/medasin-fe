import { useState } from "react";
import { useAreaMutation } from "../queries/area-query";
import type { Area, AreaInput } from "../type";

export function useAreaFormDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area>();
  const createArea = useAreaMutation("create");
  const updateArea = useAreaMutation("update", editingArea?.uuid);

  const openCreate = () => {
    setEditingArea(undefined);
    setIsOpen(true);
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setIsOpen(true);
  };

  const submit = async (input: AreaInput) => {
    if (editingArea) {
      await updateArea.mutateAsync(input);
      return;
    }

    await createArea.mutateAsync(input);
  };

  return {
    area: editingArea,
    isOpen,
    isPending: createArea.isPending || updateArea.isPending,
    openCreate,
    openEdit,
    setIsOpen,
    submit,
  };
}
