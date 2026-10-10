import type { ProjectListCard, ProjectStatus } from "./type";

export type ProjectListTab = "active" | "inbox";
export type ProjectStatusFilter = "all" | ProjectStatus | "overdue";
export type ProjectSort = "recent" | "due" | "progress" | "name";
export type ProjectView = "grid" | "list";

export type ProjectStatusCounts = Record<ProjectStatusFilter, number>;

export type ProjectDue = {
  label: string;
  tone: "default" | "overdue" | "none";
};

export const projectSortOptions: { value: ProjectSort; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "due", label: "Due date" },
  { value: "progress", label: "Progress" },
  { value: "name", label: "Name" },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    parseLocalDate(value),
  );
}

export function searchProjects(projects: ProjectListCard[], search: string) {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return projects;

  return projects.filter((project) =>
    [project.name, project.description, project.area?.name].some((value) =>
      value?.toLocaleLowerCase().includes(term),
    ),
  );
}

export function filterProjectsByStatus(
  projects: ProjectListCard[],
  status: ProjectStatusFilter,
) {
  if (status === "all") return projects;
  if (status === "overdue") {
    return projects.filter((project) => project.is_overdue);
  }

  return projects.filter((project) => project.status === status);
}

export function sortProjects(projects: ProjectListCard[], sort: ProjectSort) {
  if (sort === "recent") return projects;

  return [...projects].sort((first, second) => {
    if (sort === "progress") {
      return second.progress_percentage - first.progress_percentage;
    }
    if (sort === "due") {
      if (!first.due_date) return second.due_date ? 1 : 0;
      if (!second.due_date) return -1;
      return first.due_date.localeCompare(second.due_date);
    }

    return first.name.localeCompare(second.name, undefined, {
      sensitivity: "base",
    });
  });
}

export function countProjectsByStatus(
  projects: ProjectListCard[],
): ProjectStatusCounts {
  return projects.reduce<ProjectStatusCounts>(
    (counts, project) => {
      counts.all += 1;
      counts[project.status] += 1;
      if (project.is_overdue) counts.overdue += 1;
      return counts;
    },
    { all: 0, not_started: 0, in_progress: 0, completed: 0, overdue: 0 },
  );
}

export function formatProjectDue(project: ProjectListCard): ProjectDue {
  if (project.is_overdue && project.days_overdue) {
    return {
      label: `${project.days_overdue} ${project.days_overdue === 1 ? "day" : "days"} overdue`,
      tone: "overdue",
    };
  }

  if (!project.due_date) {
    return project.start_date
      ? { label: `Starts ${formatProjectDate(project.start_date)}`, tone: "default" }
      : { label: "No due date", tone: "none" };
  }

  const days = Math.round(
    (parseLocalDate(project.due_date).getTime() - startOfToday().getTime()) /
      DAY_IN_MS,
  );
  const date = formatProjectDate(project.due_date);

  if (project.status === "completed" || days < 0) {
    return { label: `Ended ${date}`, tone: "default" };
  }
  if (days > 30) return { label: `Due ${date}`, tone: "default" };

  const relative = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  }).format(days, "day");

  return { label: `Due ${relative}`, tone: "default" };
}
