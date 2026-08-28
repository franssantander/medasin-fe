import { icons, Leaf, type LucideIcon } from "lucide-react";

export const AREA_ICONS = Object.entries(icons)
  .map(([name, icon]) => ({ name, icon: icon as LucideIcon }))
  .sort((first, second) => first.name.localeCompare(second.name));

export function areaBadgeStyle(background?: string | null) {
  const color = background || "#000000";
  const hex = color.match(/^#([0-9a-f]{6})$/i)?.[1];

  if (!hex) return { backgroundColor: color, color: "#ffffff" };

  const [red, green, blue] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return { backgroundColor: color, color: luminance > 160 ? "#111111" : "#ffffff" };
}

export function AreaIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name ? icons[name as keyof typeof icons] : undefined) as LucideIcon | undefined;
  const ResolvedIcon = Icon ?? Leaf;
  return <ResolvedIcon className={className} aria-hidden="true" />;
}
