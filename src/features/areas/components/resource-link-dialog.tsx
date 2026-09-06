"use client";

import { Check, Link2, LoaderCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ResourceIcon,
  resourceBadgeStyle,
} from "@/features/resources/components/resource-icons";
import { useResourceLinkDialog } from "../hooks/use-area-section-actions";

export function ResourceLinkDialog({
  areaUuid,
  linkedUuids,
  onChanged,
}: {
  areaUuid: string;
  linkedUuids: string[];
  onChanged: (message: string) => Promise<void>;
}) {
  const {
    close,
    filteredOptions,
    mutation,
    open,
    options,
    reset,
    resourcesQuery,
    search,
    selectedUuids,
    setOpen,
    setSearch,
    toggle,
  } = useResourceLinkDialog({ areaUuid, linkedUuids, onChanged });

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Link2 />
        Link resources
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (mutation.isPending) return;
          setOpen(nextOpen);
          if (!nextOpen) reset();
        }}
      >
        <DialogContent className="w-full max-w-2xl overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Link resources</DialogTitle>
            <DialogDescription>
              Select one or multiple resources to connect to this area.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              className="pl-9"
              placeholder="Search resources…"
              aria-label="Search available resources"
              disabled={mutation.isPending}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="grid max-h-[50vh] min-h-48 gap-2 overflow-y-auto overflow-x-hidden pr-1">
            {resourcesQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading resources…
              </div>
            ) : resourcesQuery.isError ? (
              <div className="grid content-center justify-items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Resources could not be loaded.
                </p>
                <Button type="button" variant="outline" onClick={() => resourcesQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="self-center text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? "No resources are available to link."
                  : "No resources match your search."}
              </p>
            ) : (
              filteredOptions.map((resource) => {
                const selected = selectedUuids.includes(resource.uuid);
                return (
                  <button
                    key={resource.uuid}
                    type="button"
                    aria-pressed={selected}
                    disabled={mutation.isPending}
                    className="flex min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
                    onClick={() => toggle(resource.uuid)}
                  >
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm"
                      style={resourceBadgeStyle(resource.background)}
                    >
                      <ResourceIcon name={resource.icon} className="size-5" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-2">
                      <span className="block truncate text-sm font-medium">{resource.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {resource.author || resource.source || resource.description || "No details."}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {resource.types.map((type) => (
                          <Badge key={type} variant="secondary" className="capitalize">
                            {type}
                          </Badge>
                        ))}
                        {resource.tags.map((tag) => (
                          <Badge
                            key={tag.uuid}
                            variant="outline"
                            className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {resource.types.length === 0 && resource.tags.length === 0 && (
                          <span className="text-xs text-muted-foreground">No types or tags</span>
                        )}
                      </span>
                    </span>
                    <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded border border-input bg-background">
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {resourcesQuery.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              disabled={resourcesQuery.isFetchingNextPage}
              onClick={() => resourcesQuery.fetchNextPage()}
            >
              {resourcesQuery.isFetchingNextPage
                ? "Loading…"
                : resourcesQuery.isFetchNextPageError
                  ? "Retry loading more"
                  : "Load more resources"}
            </Button>
          )}
          <DialogFooter className="sm:items-center sm:justify-between">
            <span className="text-sm text-muted-foreground">{selectedUuids.length} selected</span>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={selectedUuids.length === 0 || mutation.isPending}
                onClick={() => mutation.mutate(selectedUuids)}
              >
                {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <Link2 />}
                {mutation.isPending ? "Linking…" : `Link ${selectedUuids.length || "selected"}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
