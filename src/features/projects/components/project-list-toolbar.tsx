import { ArrowDownUp, LayoutGrid, List, Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { projectStatusLabels } from "../project-status";
import {
  projectSortOptions,
  type ProjectSort,
  type ProjectStatusCounts,
  type ProjectStatusFilter,
  type ProjectView,
} from "../project-list-utils";

const statusFilters: { value: ProjectStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_started", label: projectStatusLabels.not_started },
  { value: "in_progress", label: projectStatusLabels.in_progress },
  { value: "completed", label: projectStatusLabels.completed },
  { value: "overdue", label: "Overdue" },
];

type ProjectListToolbarProps = {
  search: string;
  status: ProjectStatusFilter;
  sort: ProjectSort;
  view: ProjectView;
  counts: ProjectStatusCounts;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProjectStatusFilter) => void;
  onSortChange: (value: ProjectSort) => void;
  onViewChange: (value: ProjectView) => void;
};

export function ProjectListToolbar({
  search,
  status,
  sort,
  view,
  counts,
  onSearchChange,
  onStatusChange,
  onSortChange,
  onViewChange,
}: ProjectListToolbarProps) {
  const visibleFilters = statusFilters.filter(
    (filter) =>
      filter.value !== "overdue" || counts.overdue > 0 || status === "overdue",
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="min-w-0 flex-1 basis-56 sm:max-w-sm">
          <InputGroupInput
            type="search"
            aria-label="Search projects"
            placeholder="Search projects"
            maxLength={255}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => onSearchChange("")}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <div className="ml-auto flex items-center gap-2">
          <Select
            items={projectSortOptions}
            value={sort}
            onValueChange={(value) => {
              if (value) onSortChange(value as ProjectSort);
            }}
          >
            <SelectTrigger
              aria-label="Sort projects"
              className="min-w-32 text-muted-foreground shadow-none hover:text-foreground"
            >
              <ArrowDownUp aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {projectSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <ToggleGroup
            variant="outline"
            spacing={0}
            aria-label="Project view"
            value={[view]}
            onValueChange={(values) => {
              const next = values[0] as ProjectView | undefined;
              if (next) onViewChange(next);
            }}
            className="shadow-none"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="text-muted-foreground aria-pressed:text-foreground"
            >
              <LayoutGrid aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="List view"
              className="text-muted-foreground aria-pressed:text-foreground"
            >
              <List aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <ToggleGroup
        aria-label="Filter by status"
        spacing={1}
        value={[status]}
        onValueChange={(values) => {
          const next = values[0] as ProjectStatusFilter | undefined;
          if (next) onStatusChange(next);
        }}
        className="flex-wrap"
      >
        {visibleFilters.map((filter) => (
          <ToggleGroupItem
            key={filter.value}
            value={filter.value}
            size="sm"
            className={
              filter.value === "overdue"
                ? "rounded-full px-3 font-normal text-amber-700 hover:text-amber-800 aria-pressed:bg-amber-500/10 aria-pressed:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 dark:aria-pressed:text-amber-300"
                : "rounded-full px-3 font-normal text-muted-foreground aria-pressed:text-foreground"
            }
          >
            {filter.label}
            <span className="text-xs tabular-nums opacity-60">
              {counts[filter.value]}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
