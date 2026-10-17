import { Archive, ArrowDownUp, ArrowUpRight, ChevronDown, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PreviewSearch, PreviewViewToggle } from "./preview-controls";
import { previewAreas } from "./preview-fixtures";
import { PreviewPageHeader } from "./preview-page-header";

// area-list.tsx in its grid view: toolbar (area-list-toolbar.tsx), area cards (area-card.tsx), and the add tile.
export default function AreasScreen() {
  return (
    <div className="grid min-w-0 gap-6">
      <PreviewPageHeader
        title={
          <span className="flex items-center gap-2">
            Areas
            <Badge variant="secondary" className="tabular-nums">
              {previewAreas.length}
            </Badge>
          </span>
        }
        description="Group the goals, habits, projects, notes, and resources that support an ongoing part of your life."
        action={
          <Button>
            <Plus />
            New area
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PreviewSearch label="Search areas" className="flex-1 basis-56 sm:max-w-sm" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" className="text-muted-foreground">
            <Archive />
            <span className="hidden sm:inline">Archived</span>
          </Button>
          <span className="hidden h-8 min-w-36 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm text-muted-foreground sm:flex">
            <ArrowDownUp className="size-4" />
            Recently updated
            <ChevronDown className="ml-auto size-4 opacity-60" />
          </span>
          <PreviewViewToggle />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {previewAreas.map((area, index) => (
          <Card
            key={area.name}
            className={cn(
              "relative gap-0 py-0",
              // The first card shows the hover lift, like a pointer resting on it.
              index === 0 && "-translate-y-0.5 shadow-lg",
            )}
          >
            <div className="relative aspect-16/7 overflow-hidden bg-muted">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: "url('/images/area-card-cover.svg')",
                  filter: `hue-rotate(${area.hue}deg) saturate(0.85)`,
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/30 via-black/0 to-black/10" />
            </div>
            <CardContent className="flex-1 gap-1.5 px-5 pb-4">
              <div
                className="relative z-1 -mt-6 mb-2 flex size-12 items-center justify-center rounded-xl text-white shadow-md ring-4 ring-card"
                style={{ backgroundColor: area.background }}
              >
                <area.icon className="size-5" />
              </div>
              <CardTitle className="truncate text-base font-semibold">{area.name}</CardTitle>
              <CardDescription className="line-clamp-2 min-h-10">{area.description}</CardDescription>
            </CardContent>
            <CardFooter className="justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
              <span className="truncate">{area.updated}</span>
              <ArrowUpRight className={cn("size-4 shrink-0", index === 0 && "text-foreground")} />
            </CardFooter>
          </Card>
        ))}
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted">
            <Plus className="size-5" />
          </span>
          <span className="font-medium">Add another area</span>
        </div>
      </div>
    </div>
  );
}
