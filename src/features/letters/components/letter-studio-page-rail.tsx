"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LetterCover, LetterExport, LetterPage } from "../type";
import { LetterPageThumbnail } from "./letter-page-preview";

export function LetterStudioPageRail({
  pages,
  canvas,
  pageTheme,
  selectedUuid,
  onSelect,
  onDragEnd,
}: {
  pages: LetterPage[];
  canvas: LetterExport["canvas"];
  pageTheme: LetterCover["theme"];
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={pages.map((page) => page.uuid)} strategy={horizontalListSortingStrategy}>
        <nav
          aria-label="Pages"
          className="workspace-list-scrollbar flex min-w-0 gap-3 overflow-x-auto border-b bg-background p-3 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-4"
        >
          <p className="hidden text-xs font-medium text-muted-foreground lg:block">
            {pages.length} {pages.length === 1 ? "page" : "pages"}
          </p>
          {pages.map((page) => (
            <SortablePage
              key={page.uuid}
              page={page}
              canvas={canvas}
              pageTheme={pageTheme}
              selected={page.uuid === selectedUuid}
              onSelect={() => onSelect(page.uuid)}
            />
          ))}
        </nav>
      </SortableContext>
    </DndContext>
  );
}

function SortablePage({
  page,
  canvas,
  pageTheme,
  selected,
  onSelect,
}: {
  page: LetterPage;
  canvas: LetterExport["canvas"];
  pageTheme: LetterCover["theme"];
  selected: boolean;
  onSelect: () => void;
}) {
  const movable = page.layout !== "cover" && page.content_source !== "cover_entry";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.uuid,
    disabled: !movable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/page relative flex w-20 shrink-0 flex-col gap-1.5 lg:w-full",
        isDragging && "z-10 opacity-60",
      )}
    >
      <button
        type="button"
        className="w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Edit page ${page.number}`}
        aria-current={selected ? "page" : undefined}
        onClick={onSelect}
      >
        <LetterPageThumbnail
          page={page}
          canvas={canvas}
          pageTheme={pageTheme}
          selected={selected}
        />
      </button>
      <span
        aria-hidden="true"
        className={cn(
          "text-center text-[0.6875rem] leading-4 font-medium tabular-nums",
          selected ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {page.layout === "cover" ? "Cover" : page.number}
      </span>
      {movable ? (
        <button
          type="button"
          className="absolute top-1 right-1 flex size-11 touch-none items-center justify-center rounded-md bg-white/90 text-zinc-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-7 pointer-fine:opacity-0 pointer-fine:group-hover/page:opacity-100 pointer-fine:focus-visible:opacity-100"
          aria-label={`Reorder page ${page.number}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
