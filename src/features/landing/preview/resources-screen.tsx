import { Check, CirclePile, Ellipsis, Hash, Library, Paperclip, Plus, Tags, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { resourceTypeOptions } from "@/features/resources/components/resource-list-options";
import { cn } from "@/lib/utils";
import { PreviewSearch, PreviewViewToggle } from "./preview-controls";
import { previewResourceTags, previewResources } from "./preview-fixtures";
import { PreviewPageHeader } from "./preview-page-header";

const VISIBLE_TAGS = 3;
const filterItemClassName = "flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0";

function FilterItem({ icon: Icon, label, active }: { icon: typeof Library; label: string; active?: boolean }) {
  return (
    <span className={cn(filterItemClassName, active ? "bg-muted font-medium text-foreground" : "text-muted-foreground")}>
      <Icon />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active && <Check />}
    </span>
  );
}

// resource-list.tsx: the filter rail (resource-list-filters.tsx), the toolbar, and resource-list-card.tsx in a grid.
export default function ResourcesScreen() {
  return (
    <div className="grid min-w-0 gap-6">
      <PreviewPageHeader
        title="Resources"
        description="Keep notes, links, images, and files organized in one searchable place."
        action={
          <Button>
            <Plus data-icon="inline-start" />
            New resource
          </Button>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="hidden min-w-0 flex-col gap-4 lg:flex">
          <div className="grid gap-1">
            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Library</p>
            <FilterItem icon={Library} label="All resources" active />
            {resourceTypeOptions.map((option) => (
              <FilterItem key={option.value} icon={option.icon} label={option.label} />
            ))}
          </div>
          <Separator />
          <div className="grid gap-1">
            <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Tags</p>
            <FilterItem icon={Tags} label="All tags" active />
            {previewResourceTags.map((tag) => (
              <FilterItem key={tag} icon={Hash} label={tag} />
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-5">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PreviewSearch label="Search resources" className="flex-1 basis-56 sm:max-w-sm" />
              <span className="ml-auto">
                <PreviewViewToggle />
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{previewResources.length} resources</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {previewResources.map((resource) => {
              const visibleTags = resource.tags.slice(0, VISIBLE_TAGS);
              return (
                <Card key={resource.title} size="sm" className="h-full gap-0 p-0 shadow-none">
                  <div className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: resource.background }}
                      >
                        <resource.icon className="size-4" />
                      </div>
                      <div className="grid min-w-0 flex-1 gap-1 pt-px">
                        <p className="line-clamp-2 text-[15px] leading-snug font-medium">{resource.title}</p>
                        <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                          {resource.types.map((value) => {
                            const option = resourceTypeOptions.find((item) => item.value === value)!;
                            return (
                              <span key={value} className="inline-flex items-center gap-1">
                                <option.icon className="size-3" />
                                {option.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-2 shrink-0 text-muted-foreground">
                        <Ellipsis />
                      </Button>
                    </div>
                    <p className="line-clamp-3 text-sm/relaxed text-muted-foreground">{resource.summary}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {visibleTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="max-w-40 font-normal">
                          <span className="truncate">{tag}</span>
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-auto -mb-1.5 flex min-h-7 items-center gap-2 border-t pt-3">
                      {resource.link && (
                        <Badge variant="outline" className="max-w-[60%] min-w-0 font-normal">
                          {resource.link.kind === "project" ? <Target /> : <CirclePile />}
                          <span className="min-w-0 truncate">{resource.link.name}</span>
                        </Badge>
                      )}
                      {resource.attachments && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Paperclip className="size-3.5" />
                          {resource.attachments}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                        {resource.updated}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
