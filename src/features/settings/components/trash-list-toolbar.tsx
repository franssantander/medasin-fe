import { Search, Trash2 } from "lucide-react";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TrashItemType } from "../types";
import { trashTypeOptions } from "./trash-item-config";

type TrashListToolbarProps = {
  searchInput: string;
  type?: TrashItemType;
  total?: number;
  onSearchChange: (value: string) => void;
  onTypeChange: (value?: TrashItemType) => void;
};

export function TrashListToolbar({
  searchInput,
  type,
  total,
  onSearchChange,
  onTypeChange,
}: TrashListToolbarProps) {
  return (
    <>
      <CardHeader className="border-b p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <Trash2 className="size-4" />
              </span>
              <CardTitle className="text-lg font-bold">Trash</CardTitle>
            </div>
            <CardDescription className="max-w-2xl leading-6">
              Deleted items are permanently removed after 30 days. Restore
              anything you want to keep before its expiry date.
            </CardDescription>
          </div>
          {total !== undefined && (
            <div className="rounded-lg border bg-muted/50 px-3 py-2 sm:text-right">
              <p className="text-2xl font-bold tabular-nums">{total}</p>
              <p className="text-xs text-muted-foreground">items in Trash</p>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:p-5">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search Trash</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchInput}
            className="pl-9"
            placeholder="Search deleted items…"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <Select
          value={type ?? "all"}
          onValueChange={(value) =>
            onTypeChange(
              value === "all" ? undefined : (value as TrashItemType),
            )
          }
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">All content types</SelectItem>
            {trashTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <option.icon />
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
