import {
  CheckSquare2,
  CirclePile,
  FileText,
  Flame,
  FolderKanban,
  LayoutDashboard,
  Paperclip,
  StarCheck,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { TrashItemType } from "../types";

export type TrashTypeOption = {
  value: TrashItemType;
  label: string;
  singularLabel: string;
  icon: LucideIcon;
};

export const trashTypeOptions: TrashTypeOption[] = [
  { value: "area", label: "Areas", singularLabel: "Area", icon: CirclePile },
  {
    value: "project",
    label: "Projects",
    singularLabel: "Project",
    icon: FolderKanban,
  },
  {
    value: "board",
    label: "Boards",
    singularLabel: "Board",
    icon: LayoutDashboard,
  },
  {
    value: "task",
    label: "Tasks",
    singularLabel: "Task",
    icon: CheckSquare2,
  },
  { value: "goal", label: "Goals", singularLabel: "Goal", icon: StarCheck },
  { value: "habit", label: "Habits", singularLabel: "Habit", icon: Flame },
  { value: "note", label: "Notes", singularLabel: "Note", icon: FileText },
  {
    value: "board_label",
    label: "Board labels",
    singularLabel: "Board label",
    icon: Tag,
  },
  {
    value: "resource_attachment",
    label: "Attachments",
    singularLabel: "Attachment",
    icon: Paperclip,
  },
];

export const trashTypeConfig = Object.fromEntries(
  trashTypeOptions.map((option) => [option.value, option]),
) as Record<TrashItemType, TrashTypeOption>;
