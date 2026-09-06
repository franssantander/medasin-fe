"use client";

import { Check, Link2, LoaderCircle, Search, Target, TriangleAlert } from "lucide-react";
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
  projectStatusBadgeClassNames,
  projectStatusLabels,
} from "@/features/projects/project-status";
import { useProjectLinkDialog } from "../hooks/use-area-section-actions";
import type { Project } from "../type";

export function ProjectLinkDialog({
  areaUuid,
  linked,
  onChanged,
}: {
  areaUuid: string;
  linked: Project[];
  onChanged: (message: string) => Promise<void>;
}) {
  const {
    close,
    filteredOptions,
    movingProjects,
    mutation,
    open,
    options,
    projectsQuery,
    reset,
    search,
    selectedUuids,
    setOpen,
    setSearch,
    toggle,
  } = useProjectLinkDialog({ areaUuid, linked, onChanged });

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Link2 />
        Link projects
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
            <DialogTitle>Link projects</DialogTitle>
            <DialogDescription>
              Select one or multiple projects to connect to this area.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              className="pl-9"
              placeholder="Search projects…"
              aria-label="Search available projects"
              disabled={mutation.isPending}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="grid max-h-[50vh] min-h-48 gap-2 overflow-y-auto overflow-x-hidden pr-1">
            {projectsQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading projects…
              </div>
            ) : projectsQuery.isError ? (
              <div className="grid content-center justify-items-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Projects could not be loaded.
                </p>
                <Button type="button" variant="outline" onClick={() => projectsQuery.refetch()}>
                  Try again
                </Button>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="self-center text-center text-sm text-muted-foreground">
                {options.length === 0
                  ? "No projects are available to link."
                  : "No projects match your search."}
              </p>
            ) : (
              filteredOptions.map((project) => {
                const selected = selectedUuids.includes(project.uuid);
                return (
                  <button
                    key={project.uuid}
                    type="button"
                    aria-pressed={selected}
                    disabled={mutation.isPending}
                    className="flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
                    onClick={() => toggle(project.uuid)}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <Target className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{project.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {project.area
                          ? `Currently in ${project.area.name} · linking will move it`
                          : project.description || "Currently in Inbox"}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className={`hidden sm:inline-flex ${projectStatusBadgeClassNames[project.status]}`}
                    >
                      {projectStatusLabels[project.status]}
                    </Badge>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded border border-input bg-background">
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {movingProjects.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                {movingProjects.length} selected{" "}
                {movingProjects.length === 1 ? "project is" : "projects are"}{" "}
                already linked to another area and will be moved here.
              </span>
            </div>
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
