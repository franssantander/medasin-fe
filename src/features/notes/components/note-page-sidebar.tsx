"use client";

import {
  ChevronRight,
  Ellipsis,
  FilePlus2,
  FileText,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildNotePath,
  findAncestorUuids,
  noteTitle,
  type FlatNote,
} from "../note-tree-utils";
import type { NoteTreeNode } from "../type";

export type NotePageActions = {
  onSelect: (uuid: string) => void;
  onAddChild: (uuid: string) => void;
  onPin: (uuid: string, pinned: boolean) => void;
  onDelete: (uuid: string) => void;
};

type NotePageSidebarProps = NotePageActions & {
  tree: NoteTreeNode[];
  flatNotes: FlatNote[];
  selectedUuid?: string;
  archived: boolean;
  canCreate: boolean;
  createPending: boolean;
  onNewPage: () => void;
  onCollapse?: () => void;
};

type RowActionProps = Pick<
  NotePageActions,
  "onAddChild" | "onPin" | "onDelete"
> & {
  editable: boolean;
  createPending: boolean;
};

export function NotePageSidebar({
  tree,
  flatNotes,
  selectedUuid,
  archived,
  canCreate,
  createPending,
  onNewPage,
  onCollapse,
  onSelect,
  onAddChild,
  onPin,
  onDelete,
}: NotePageSidebarProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [expandedUuids, setExpandedUuids] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleExpanded = useMemo(
    () => new Set([...expandedUuids, ...findAncestorUuids(tree, selectedUuid)]),
    [expandedUuids, selectedUuid, tree],
  );
  const searchResults = useMemo(() => {
    if (!deferredSearch) return [];
    return flatNotes.filter((note) =>
      `${note.title} ${getNoteDocumentPreview(note.content)}`
        .toLowerCase()
        .includes(deferredSearch),
    );
  }, [deferredSearch, flatNotes]);
  const pinnedNotes = flatNotes.filter((note) => note.is_pinned);
  const editable = !archived;
  const actionProps: RowActionProps = {
    editable,
    createPending,
    onAddChild,
    onPin,
    onDelete,
  };

  const toggle = (uuid: string, open: boolean) =>
    setExpandedUuids((current) => {
      const next = new Set(current);
      if (open) next.add(uuid);
      else next.delete(uuid);
      return next;
    });
  const select = (node: NoteTreeNode) => {
    onSelect(node.uuid);
    if (node.children.length > 0) toggle(node.uuid, true);
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-sm font-semibold">Pages</h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {flatNotes.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {canCreate && (
            <IconTooltipButton
              label="New page"
              disabled={createPending}
              onClick={onNewPage}
            >
              <Plus />
            </IconTooltipButton>
          )}
          {onCollapse && (
            <IconTooltipButton label="Collapse sidebar" onClick={onCollapse}>
              <PanelLeftClose />
            </IconTooltipButton>
          )}
        </div>
      </div>

      {flatNotes.length > 0 && (
        <div className="px-3 pb-2">
          <InputGroup className="h-8 bg-background">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label="Search pages"
              placeholder="Search pages"
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
        aria-label="Pages"
        className="workspace-list-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2"
      >
        {deferredSearch ? (
          <SidebarSection
            label={`${searchResults.length} ${searchResults.length === 1 ? "result" : "results"}`}
          >
            {searchResults.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No pages match “{search.trim()}”.
              </p>
            ) : (
              <ul className="grid gap-px">
                {searchResults.map((note) => (
                  <FlatPageRow
                    key={note.uuid}
                    note={note}
                    hint={buildNotePath(flatNotes, note.uuid)
                      .slice(0, -1)
                      .map((ancestor) => noteTitle(ancestor.title))
                      .join(" › ")}
                    selected={note.uuid === selectedUuid}
                    onSelect={() => onSelect(note.uuid)}
                    {...actionProps}
                  />
                ))}
              </ul>
            )}
          </SidebarSection>
        ) : tree.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {archived ? "No pages in this archived area." : "No pages yet."}
          </p>
        ) : (
          <div className="grid gap-4">
            {pinnedNotes.length > 0 && (
              <SidebarSection label="Pinned">
                <ul className="grid gap-px">
                  {pinnedNotes.map((note) => (
                    <FlatPageRow
                      key={note.uuid}
                      note={note}
                      selected={note.uuid === selectedUuid}
                      onSelect={() => onSelect(note.uuid)}
                      {...actionProps}
                    />
                  ))}
                </ul>
              </SidebarSection>
            )}
            <SidebarSection label={pinnedNotes.length > 0 ? "All pages" : undefined}>
              <TreeLevel
                nodes={tree}
                depth={0}
                expanded={visibleExpanded}
                selectedUuid={selectedUuid}
                onToggle={toggle}
                onSelect={select}
                {...actionProps}
              />
            </SidebarSection>
          </div>
        )}
      </nav>

      {canCreate && (
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            disabled={createPending}
            onClick={onNewPage}
          >
            <Plus data-icon="inline-start" />
            New page
          </Button>
        </div>
      )}
    </div>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-1">
      {label && (
        <h3 className="px-2 pt-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </h3>
      )}
      {children}
    </section>
  );
}

function TreeLevel({
  nodes,
  depth,
  expanded,
  selectedUuid,
  onToggle,
  onSelect,
  ...actionProps
}: RowActionProps & {
  nodes: NoteTreeNode[];
  depth: number;
  expanded: Set<string>;
  selectedUuid?: string;
  onToggle: (uuid: string, open: boolean) => void;
  onSelect: (node: NoteTreeNode) => void;
}) {
  return (
    <ul className="grid gap-px">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = hasChildren && expanded.has(node.uuid);
        const title = noteTitle(node.title);

        return (
          <li key={node.uuid}>
            <PageRow
              note={node}
              depth={depth}
              selected={node.uuid === selectedUuid}
              onSelect={() => onSelect(node)}
              leading={
                hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
                    className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                    onClick={() => onToggle(node.uuid, !isOpen)}
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <span aria-hidden="true" className="size-6 shrink-0" />
                )
              }
              {...actionProps}
            />
            {isOpen && (
              <TreeLevel
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                selectedUuid={selectedUuid}
                onToggle={onToggle}
                onSelect={onSelect}
                {...actionProps}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function FlatPageRow({
  note,
  hint,
  selected,
  onSelect,
  ...actionProps
}: RowActionProps & {
  note: FlatNote;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <PageRow
        note={note}
        depth={0}
        hint={hint}
        selected={selected}
        onSelect={onSelect}
        {...actionProps}
      />
    </li>
  );
}

function PageRow({
  note,
  depth,
  hint,
  selected,
  leading,
  onSelect,
  editable,
  createPending,
  onAddChild,
  onPin,
  onDelete,
}: RowActionProps & {
  note: Pick<FlatNote, "uuid" | "title" | "is_pinned">;
  depth: number;
  hint?: string;
  selected: boolean;
  leading?: React.ReactNode;
  onSelect: () => void;
}) {
  const title = noteTitle(note.title);
  const Icon = note.is_pinned ? Pin : FileText;

  return (
    <div
      className={cn(
        "group/row relative flex min-h-8 min-w-0 items-center gap-0.5 rounded-md pr-1 text-sm transition-colors hover:bg-muted",
        selected && "bg-accent font-medium text-accent-foreground hover:bg-accent",
        !leading && "pl-1",
      )}
      style={leading ? { paddingLeft: 4 + depth * 14 } : undefined}
    >
      {leading}
      <button
        type="button"
        aria-current={selected ? "page" : undefined}
        title={title}
        className="flex min-h-8 min-w-0 flex-1 items-center gap-2 rounded-sm px-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={onSelect}
      >
        <Icon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        <span className="grid min-w-0 flex-1 py-1">
          <span className={cn("truncate", !note.title.trim() && "text-muted-foreground")}>
            {title}
          </span>
          {hint && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              in {hint}
            </span>
          )}
        </span>
      </button>
      {editable && (
        <div className="flex shrink-0 items-center pointer-fine:opacity-0 pointer-fine:group-focus-within/row:opacity-100 pointer-fine:group-hover/row:opacity-100 pointer-fine:has-data-popup-open:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Add a page inside ${title}`}
            title="Add a page inside"
            disabled={createPending}
            className="hover:bg-foreground/10"
            onClick={() => onAddChild(note.uuid)}
          >
            <Plus />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`More actions for ${title}`}
                  className="hover:bg-foreground/10"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="start">
              <DropdownMenuItem
                disabled={createPending}
                onClick={() => onAddChild(note.uuid)}
              >
                <FilePlus2 />
                Add sub-page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPin(note.uuid, !note.is_pinned)}>
                {note.is_pinned ? <PinOff /> : <Pin />}
                {note.is_pinned ? "Unpin" : "Pin to top"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => onDelete(note.uuid)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

export function IconTooltipButton({
  label,
  shortcut,
  disabled,
  preserveFocus = false,
  onClick,
  children,
}: {
  label: string;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  preserveFocus?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onPointerDown={
              preserveFocus ? (event) => event.preventDefault() : undefined
            }
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut}
      </TooltipContent>
    </Tooltip>
  );
}
