export function letterDisplayTitle(title: string | null | undefined) {
  return title?.trim() || "Untitled letter";
}

export function formatWordCount(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? "word" : "words"}`;
}

export function formatReadTime(value: number) {
  return `${value} ${value === 1 ? "min" : "mins"} read`;
}

export function formatListTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}
