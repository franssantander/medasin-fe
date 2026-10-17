import { CirclePile } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ArchiveGroup, ArchiveRow } from "@/features/archives/components/archive-list";
import { projectStatusBadgeClassNames } from "@/features/projects/project-status";
import { PreviewLineTabs, PreviewSearch } from "./preview-controls";
import { previewArchives, type PreviewArchiveItem } from "./preview-fixtures";
import { PreviewPageHeader } from "./preview-page-header";

const noop = () => {};

const groups: { key: keyof typeof previewArchives; title: string }[] = [
  { key: "areas", title: "Areas" },
  { key: "projects", title: "Projects" },
  { key: "resources", title: "Resources" },
];

function Media({ item }: { item: PreviewArchiveItem }) {
  return (
    <div
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
      style={{ backgroundColor: item.background }}
    >
      <item.icon className="size-4" />
    </div>
  );
}

// archives-page.tsx on its "All" tab, built from the real ArchiveGroup and ArchiveRow.
export default function ArchivesScreen() {
  return (
    <div className="grid min-w-0 gap-6">
      <PreviewPageHeader
        title="Archives"
        description="Archived items are read-only and hidden from your workspace. Restore anything to bring it back."
      />
      <div className="grid gap-5">
        <div className="flex flex-col-reverse gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
          <div className="-mb-px overflow-x-auto">
            <PreviewLineTabs
              tabs={[
                { label: "All" },
                ...groups.map((group) => ({ label: group.title, count: previewArchives[group.key].length })),
              ]}
            />
          </div>
          <PreviewSearch label="Search archives" className="mb-2 h-9 w-full sm:w-64" />
        </div>
        <div className="grid gap-8">
          {groups.map((group) => (
            <ArchiveGroup
              key={group.key}
              id={`preview-archived-${group.key}`}
              title={group.title}
              count={previewArchives[group.key].length}
              showHeading
              isLoading={false}
              isError={false}
              skeletonLabel=""
              emptyLabel=""
              isEmpty={false}
              onRetry={noop}
            >
              {previewArchives[group.key].map((item) => (
                <ArchiveRow
                  key={item.title}
                  media={<Media item={item} />}
                  title={item.title}
                  secondary={item.secondary}
                  meta={
                    item.area ? (
                      <>
                        <Badge variant="outline" className={projectStatusBadgeClassNames.completed}>
                          Completed
                        </Badge>
                        <span className="flex w-32 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <CirclePile className="size-3.5 shrink-0" />
                          <span className="truncate">{item.area}</span>
                        </span>
                      </>
                    ) : undefined
                  }
                  archivedAt={item.archivedAt}
                  openLabel={`Open ${item.title}`}
                  onOpen={noop}
                  restoring={false}
                  onRestore={noop}
                />
              ))}
            </ArchiveGroup>
          ))}
        </div>
      </div>
    </div>
  );
}
