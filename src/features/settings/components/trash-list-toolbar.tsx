import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
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
import type { TrashItemType } from "../types";
import { trashTypeOptions } from "./trash-item-config";

const trashFilterItems = [
  { value: "all", label: "All content types" },
  ...trashTypeOptions,
];

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
      <CardHeader className="shrink-0 border-b p-5 sm:p-6">
        <CardTitle>
          <h2>Trash</h2>
        </CardTitle>
        <CardDescription>
          Deleted items stay here for 30 days. Restore them before they expire.
        </CardDescription>
        {total !== undefined && (
          <CardAction>
            <Badge variant="secondary">
              <span className="tabular-nums">{total}</span>
              {total === 1 ? "item" : "items"}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      <div className="flex shrink-0 flex-col gap-3 border-b p-5 sm:p-6 @min-[30rem]/trash:flex-row">
        <InputGroup className="min-w-0 flex-1">
          <InputGroupInput
            type="search"
            aria-label="Search Trash"
            value={searchInput}
            placeholder="Search deleted items…"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        <Select
          items={trashFilterItems}
          value={type ?? "all"}
          onValueChange={(value) =>
            onTypeChange(
              value === "all" ? undefined : (value as TrashItemType),
            )
          }
        >
          <SelectTrigger
            className="w-full @min-[30rem]/trash:w-48"
            aria-label="Filter by type"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectGroup>
              <SelectItem value="all">All content types</SelectItem>
              {trashTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <option.icon aria-hidden="true" />
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
