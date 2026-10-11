"use client";

import {
  ChevronRight,
  Ellipsis,
  FilePlus2,
  FileText,
  Folder,
  PanelLeftClose,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getNoteDocumentPreview } from "@/components/ui/note-editor-document";
import { cn } from "@/lib/utils";
import {
  buildNotePath,
  findAncestorUuids,
  formatNoteListTime,
  noteTimeGroup,
  noteTitle,
  type FlatNote,
  type NoteTimeGroup,
} from "../note-tree-utils";
import type { NoteTreeNode } from "../type";
import { IconTooltipButton } from "./note-page-sidebar";

export type NoteListCollection = {
  key: string;
  label: string;
  archived: boolean;
  showLabel: boolean;
  tree: NoteTreeNode[];
  flatNotes: FlatNote[];
};

export type NoteListActions = {
  onSelect: (collectionKey: string, uuid: string) => void;
  onAddChild: (collectionKey: string, uuid: string) => void;
  onPin: (collectionKey: string, uuid: string, pinned: boolean) => void;
  onDelete: (collectionKey: string, uuid: string) => void;
};

type Entry = { node: NoteTreeNode; collection: NoteListCollection };

const groups: { key: "pinned" | NoteTimeGroup; label: string }[] = [
  { key: "pinned", label: "Pinned" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "Previous 7 days" },
  { key: "earlier", label: "Earlier" },
];

const rowKey = (collectionKey: string, uuid: string) =>
  collectionKey + ":" + uuid;

// The Notes list: notes from every collection, newest first, grouped by
// when they were last edited. Sub-pages fold away under their parent.
export function NoteListRail({
  collections,
  selectedCollectionKey,
  selectedUuid,
  createPending,
  onNew,
  onCollapse,
  ...actions
}: NoteListActions & {
  collections: NoteListCollection[];
  selectedCollectionKey: string;
  selectedUuid?: string;
  createPending: boolean;
  onNew?: () => void;
  onCollapse?: () => void;
}) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search.trim().toLowerCase());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [now] = useState(() => new Date());
  const total = collections.reduce(
    (count, collection) => count + collection.flatNotes.length,
    0,
  );

  const visibleExpanded = useMemo(() => {
    const next = new Set(expanded);
    const selected = collections.find(
      (collection) => collection.key === selectedCollectionKey,
    );
    if (selected)
      for (const uuid of findAncestorUuids(selected.tree, selectedUuid))
        next.add(rowKey(selected.key, uuid));
    return next;
  }, [collections, expanded, selectedCollectionKey, selectedUuid]);

  const grouped = useMemo(() => {
    const entries: Entry[] = collections
      .flatMap((collection) =>
        collection.tree.map((node) => ({ node, collection })),
      )
      .sort((a, b) => b.node.updated_at.localeCompare(a.node.updated_at));
    return groups
      .map((group) => ({
        ...group,
        entries: entries.filter(({ node }) =>
          group.key === "pinned"
            ? node.is_pinned
            : !node.is_pinned && noteTimeGroup(node.updated_at, now) === group.key,
        ),
      }))
      .filter((group) => group.entries.length > 0);
  }, [collections, now]);

  const results = useMemo(() => {
    if (!query) return [];
    return collections.flatMap((collection) =>
      collection.flatNotes
        .filter((note) =>
          (note.title + " " + getNoteDocumentPreview(note.content))
            .toLowerCase()
            .includes(query),
        )
        .map((note) => ({ note, collection })),
    );
  }, [collections, query]);

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (visibleExpanded.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const isSelected = (collectionKey: string, uuid: string) =>
    collectionKey === selectedCollectionKey && uuid === selectedUuid;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h1 className="text-base font-semibold">Notes</h1>
          <span className="text-xs text-muted-foreground tabular-nums">
            {total}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {onNew && (
            <IconTooltipButton
              label="New note"
              disabled={createPending}
              onClick={onNew}
            >
              <Plus />
            </IconTooltipButton>
          )}
          {onCollapse && (
            <IconTooltipButton label="Collapse notes list" onClick={onCollapse}>
              <PanelLeftClose />
            </IconTooltipButton>
          )}
        </div>
      </div>

      {total > 0 && (
        <div className="px-3 pb-2">
          <InputGroup className="h-8 bg-background">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search notes"
              placeholder="Search notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearch("");
              }}
            />
            {search && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      )}

      <nav
        aria-label="Notes list"
        className="workspace-list-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3"
      >
        {query ? (
          <Section
            label={
              results.length + (results.length === 1 ? " result" : " results")
            }
          >
            {results.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No notes match “{search.trim()}”.
              </p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-0.5">
                {results.map(({ note, collection }) => (
                  <li key={rowKey(collection.key, note.uuid)}>
                    <NoteListItem
                      note={note}
                      collection={collection}
                      now={now}
                      hint={buildNotePath(collection.flatNotes, note.uuid)
                        .slice(0, -1)
                        .map((ancestor) => noteTitle(ancestor.title))
                        .join(" › ")}
                      selected={isSelected(collection.key, note.uuid)}
                      createPending={createPending}
                      {...actions}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : total === 0 ? (
          <div className="grid gap-1 px-3 py-8 text-center">
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-sm text-muted-foreground">
              Start typing on the right, or create a new note.
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            {grouped.map((group) => (
              <Section key={group.key} label={group.label}>
                <ul className="flex min-w-0 flex-col gap-0.5">
                  {group.entries.map(({ node, collection }) => {
                    const key = rowKey(collection.key, node.uuid);
                    const open = visibleExpanded.has(key);
                    return (
                      <li key={key}>
                        <NoteListItem
                          note={node}
                          collection={collection}
                          now={now}
                          childCount={node.children.length}
                          open={open}
                          onToggle={() => toggle(key)}
                          selected={isSelected(collection.key, node.uuid)}
                          createPending={createPending}
                          {...actions}
                        />
                        {open && (
                          <SubPages
                            nodes={node.children}
                            collection={collection}
                            expanded={visibleExpanded}
                            onToggle={toggle}
                            isSelected={isSelected}
                            createPending={createPending}
                            {...actions}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1">
      <h2 className="px-2 pt-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}

function NoteListItem({
  note,
  collection,
  now,
  hint,
  childCount = 0,
  open = false,
  onToggle,
  selected,
  createPending,
  onSelect,
  onAddChild,
  onPin,
  onDelete,
}: NoteListActions & {
  note: Pick<FlatNote, "uuid" | "title" | "content" | "is_pinned" | "updated_at">;
  collection: NoteListCollection;
  now: Date;
  hint?: string;
  childCount?: number;
  open?: boolean;
  onToggle?: () => void;
  selected: boolean;
  createPending: boolean;
}) {
  const title = noteTitle(note.title);
  const preview = getNoteDocumentPreview(note.content);
  const showMeta = collection.showLabel || childCount > 0 || Boolean(hint);

  return (
    <div
      className={cn(
        "group/note relative min-w-0 rounded-lg transition-colors hover:bg-muted/70",
        selected && "bg-accent text-accent-foreground hover:bg-accent",
      )}
    >
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        title={title}
        className="flex w-full min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => {
          onSelect(collection.key, note.uuid);
          if (childCount > 0 && !open) onToggle?.();
        }}
      >
        <span className="flex min-w-0 items-center gap-1.5 pr-7">
          {note.is_pinned && (
            <>
              <Pin
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground"
              />
              <span className="sr-only">Pinned. </span>
            </>
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-medium",
              !note.title.trim() && "text-muted-foreground",
            )}
          >
            {title}
          </span>
          <time
            dateTime={note.updated_at}
            className="shrink-0 text-xs text-muted-foreground tabular-nums transition-opacity pointer-fine:group-focus-within/note:opacity-0 pointer-fine:group-hover/note:opacity-0"
          >
            {formatNoteListTime(note.updated_at, now)}
          </time>
        </span>
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {preview || "No content yet"}
        </span>
        {showMeta && (
          <span
            className={cn(
              "flex min-w-0 items-center gap-2 pt-0.5 text-xs text-muted-foreground",
              childCount > 0 && "pr-6",
            )}
          >
            {collection.showLabel && (
              <span className="flex min-w-0 items-center gap-1">
                <Folder aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{collection.label}</span>
              </span>
            )}
            {hint && <span className="min-w-0 truncate">in {hint}</span>}
            {childCount > 0 && (
              <span className="shrink-0">
                {childCount} {childCount === 1 ? "page" : "pages"}
              </span>
            )}
          </span>
        )}
      </button>
      {childCount > 0 && onToggle && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={(open ? "Hide" : "Show") + " pages in " + title}
          className="absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={onToggle}
        >
          <ChevronRight
            className={cn(
              "size-3 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-90",
            )}
          />
        </button>
      )}
      {!collection.archived && (
        <RowMenu
          title={title}
          pinned={note.is_pinned}
          createPending={createPending}
          className="absolute top-1.5 right-1.5"
          onAddChild={() => onAddChild(collection.key, note.uuid)}
          onPin={() => onPin(collection.key, note.uuid, !note.is_pinned)}
          onDelete={() => onDelete(collection.key, note.uuid)}
        />
      )}
    </div>
  );
}

function SubPages({
  nodes,
  collection,
  expanded,
  onToggle,
  isSelected,
  createPending,
  ...actions
}: NoteListActions & {
  nodes: NoteTreeNode[];
  collection: NoteListCollection;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  isSelected: (collectionKey: string, uuid: string) => boolean;
  createPending: boolean;
}) {
  return (
    <ul className="mt-0.5 ml-4 flex min-w-0 flex-col gap-px border-l pl-1.5">
      {nodes.map((node) => {
        const key = rowKey(collection.key, node.uuid);
        const open = expanded.has(key);
        const title = noteTitle(node.title);
        const selected = isSelected(collection.key, node.uuid);
        const hasChildren = node.children.length > 0;
        return (
          <li key={key}>
            <div
              className={cn(
                "group/note relative flex min-h-8 min-w-0 items-center rounded-md transition-colors hover:bg-muted/70",
                selected && "bg-accent text-accent-foreground hover:bg-accent",
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={(open ? "Hide" : "Show") + " pages in " + title}
                  className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => onToggle(key)}
                >
                  <ChevronRight
                    className={cn(
                      "size-3 transition-transform duration-150 motion-reduce:transition-none",
                      open && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <span aria-hidden="true" className="size-6 shrink-0" />
              )}
              <button
                type="button"
                aria-current={selected ? "page" : undefined}
                title={title}
                className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-sm pr-8 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => {
                  actions.onSelect(collection.key, node.uuid);
                  if (hasChildren && !open) onToggle(key);
                }}
              >
                <FileText
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span
                  className={cn(
                    "truncate",
                    !node.title.trim() && "text-muted-foreground",
                  )}
                >
                  {title}
                </span>
              </button>
              {!collection.archived && (
                <RowMenu
                  title={title}
                  pinned={node.is_pinned}
                  createPending={createPending}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onAddChild={() => actions.onAddChild(collection.key, node.uuid)}
                  onPin={() =>
                    actions.onPin(collection.key, node.uuid, !node.is_pinned)
                  }
                  onDelete={() => actions.onDelete(collection.key, node.uuid)}
                />
              )}
            </div>
            {open && hasChildren && (
              <SubPages
                nodes={node.children}
                collection={collection}
                expanded={expanded}
                onToggle={onToggle}
                isSelected={isSelected}
                createPending={createPending}
                {...actions}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RowMenu({
  title,
  pinned,
  createPending,
  className,
  onAddChild,
  onPin,
  onDelete,
}: {
  title: string;
  pinned: boolean;
  createPending: boolean;
  className?: string;
  onAddChild: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        "transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within/note:opacity-100 pointer-fine:group-hover/note:opacity-100 pointer-fine:has-data-popup-open:opacity-100",
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={"More actions for " + title}
              className="text-muted-foreground hover:bg-foreground/10"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end">
          <DropdownMenuItem disabled={createPending} onClick={onAddChild}>
            <FilePlus2 />
            Add sub-page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onClick={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
