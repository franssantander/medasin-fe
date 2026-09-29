import type { SearchResult } from "./search-schema";

export function searchResultHref(result: SearchResult): string {
  const id = encodeURIComponent(result.id);
  switch (result.type) {
    case "project":
      return `/projects/${id}`;
    case "area":
      return `/areas/${id}`;
    case "resource":
      return `/resources?resource=${id}`;
    case "note":
      return `/notes?note=${id}`;
    case "journal":
      return `/journal?entry=${id}`;
    case "letter":
      return `/letters?letter=${id}`;
    case "plan":
      return `/plans?plan=${id}`;
    case "habit":
      return `/habits?habit=${id}`;
    case "goal":
      return `/areas/${encodeURIComponent(result.area_uuid!)}?tab=goals&goal=${id}`;
  }
}
