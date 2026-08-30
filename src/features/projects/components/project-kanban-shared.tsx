import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BoardLabel } from "../type";
import { getLabelTextColor } from "./project-kanban-utils";

export function StatusDot({ color }: { color: string }) {
  return (
    <Circle
      aria-hidden="true"
      className="size-2.5 shrink-0 self-center fill-current"
      style={{ color }}
    />
  );
}

export function StatusValue({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
      <StatusDot color={color} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function LabelBadge({ label }: { label: BoardLabel }) {
  return (
    <Badge
      className="border-transparent"
      style={{
        backgroundColor: label.hex,
        color: getLabelTextColor(label.hex),
      }}
    >
      {label.name}
    </Badge>
  );
}
