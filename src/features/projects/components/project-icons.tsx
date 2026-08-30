import { icons, Rocket, type LucideIcon } from "lucide-react";

export const PROJECT_ICONS = Object.entries(icons)
  .map(([name, icon]) => ({ name, icon: icon as LucideIcon }))
  .sort((first, second) => first.name.localeCompare(second.name));

export const PROJECT_BADGE_COLORS = [
  { name: "Rose", value: "#F43F5E" },
  { name: "Pink", value: "#EC4899" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Purple", value: "#A855F7" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Emerald", value: "#10B981" },
  { name: "Green", value: "#22C55E" },
  { name: "Lime", value: "#84CC16" },
  { name: "Yellow", value: "#EAB308" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Orange", value: "#F97316" },
  { name: "Coral", value: "#FB7185" },
  { name: "Blush", value: "#F472B6" },
  { name: "Lavender", value: "#C084FC" },
  { name: "Periwinkle", value: "#818CF8" },
  { name: "Ocean", value: "#0284C7" },
  { name: "Aqua", value: "#2DD4BF" },
  { name: "Meadow", value: "#4ADE80" },
  { name: "Sunshine", value: "#FACC15" },
] as const;

export function projectBadgeStyle(background?: string | null) {
  const color = background || "#000000";
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];

  if (!hex) return { backgroundColor: color, color: "#ffffff" };

  const [red, green, blue] = [0, 2, 4].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16),
  );
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return {
    backgroundColor: color,
    color: luminance > 160 ? "#111111" : "#ffffff",
  };
}

export function ProjectIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name ? icons[name as keyof typeof icons] : undefined) as
    | LucideIcon
    | undefined;
  const ResolvedIcon = Icon ?? Rocket;

  return <ResolvedIcon className={className} aria-hidden="true" />;
}
