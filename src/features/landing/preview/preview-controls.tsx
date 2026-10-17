import { LayoutGrid, List, Search } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/* Static stand-ins for the list toolbars' search fields, view toggles, and line tabs. */

export function PreviewSearch({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 min-w-0 items-center gap-2 rounded-lg border border-input px-2.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <Search className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PreviewViewToggle() {
  return (
    <span className="flex shrink-0 items-center rounded-lg border">
      <span className="grid size-8 place-items-center rounded-l-lg bg-muted text-foreground">
        <LayoutGrid className="size-4" />
      </span>
      <span className="grid size-8 place-items-center border-l text-muted-foreground">
        <List className="size-4" />
      </span>
    </span>
  );
}

/** The underlined filter tabs used by Archives and Letters, with the first one selected. */
export function PreviewLineTabs({ tabs }: { tabs: { label: string; count?: number }[] }) {
  return (
    <Tabs value={tabs[0].label}>
      <TabsList variant="line" className="h-auto w-max justify-start gap-4 pb-1">
        {tabs.map(({ label, count }) => (
          <TabsTrigger
            key={label}
            value={label}
            className="flex-none px-0.5 group-data-horizontal/tabs:after:bottom-[-5px]"
          >
            {label}
            {count !== undefined && (
              <span className="text-xs font-normal text-muted-foreground tabular-nums">{count}</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
