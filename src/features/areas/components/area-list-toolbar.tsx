import {
  Archive,
  ArrowDownUp,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  areaSortOptions,
  type AreaSort,
  type AreaView,
} from "../area-list-utils";

type AreaListToolbarProps = {
  search: string;
  sort: AreaSort;
  view: AreaView;
  onSearchChange: (value: string) => void;
  onSortChange: (value: AreaSort) => void;
  onViewChange: (value: AreaView) => void;
};

export function AreaListToolbar({
  search,
  sort,
  view,
  onSearchChange,
  onSortChange,
  onViewChange,
}: AreaListToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="min-w-0 flex-1 basis-56 sm:max-w-sm">
        <InputGroupInput
          type="search"
          aria-label="Search areas"
          placeholder="Search areas"
          maxLength={255}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && search) {
              event.preventDefault();
              onSearchChange("");
            }
          }}
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
        <Button
          variant="ghost"
          className="text-muted-foreground"
          nativeButton={false}
          render={<Link href="/archives" />}
        >
          <Archive aria-hidden="true" />
          <span className="hidden sm:inline">Archived</span>
          <span className="sr-only sm:hidden">Archived areas</span>
        </Button>

        <Select
          items={areaSortOptions}
          value={sort}
          onValueChange={(value) => {
            if (value) onSortChange(value as AreaSort);
          }}
        >
          <SelectTrigger
            aria-label="Sort areas"
            className="min-w-36 text-muted-foreground shadow-none hover:text-foreground"
          >
            <ArrowDownUp aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectGroup>
              {areaSortOptions.map((option) => (
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
          aria-label="Area view"
          value={[view]}
          onValueChange={(values) => {
            const next = values[0] as AreaView | undefined;
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
  );
}
