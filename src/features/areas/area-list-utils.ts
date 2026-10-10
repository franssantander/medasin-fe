import { formatDistanceToNow } from "date-fns";
import type { Area } from "./type";

export type AreaSort = "recent" | "updated" | "name";
export type AreaView = "grid" | "list";

export const areaSortOptions: { value: AreaSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "updated", label: "Last updated" },
  { value: "name", label: "Name" },
];

export function searchAreas(areas: Area[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return areas;

  return areas.filter((area) =>
    [area.name, area.description].some((value) =>
      value?.toLocaleLowerCase().includes(term),
    ),
  );
}

export function sortAreas(areas: Area[], sort: AreaSort) {
  if (sort === "recent") return areas;

  return [...areas].sort((first, second) => {
    if (sort === "updated") {
      return second.updated_at.localeCompare(first.updated_at);
    }

    return first.name.localeCompare(second.name, undefined, {
      sensitivity: "base",
    });
  });
}

export function formatAreaUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

  return `Updated ${formatDistanceToNow(date, { addSuffix: true })}`;
}
