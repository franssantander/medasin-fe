"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BookHeart,
  BookOpen,
  CalendarCheck,
  CirclePile,
  Clock3,
  CornerDownLeft,
  Feather,
  Flag,
  House,
  LoaderCircle,
  NotebookPen,
  RefreshCw,
  Search,
  Settings,
  StarCheck,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { clearRecentSearches, readRecentSearches, saveRecentSearch } from "./recent-searches";
import { useGlobalSearch } from "./search-query";
import { searchResultHref } from "./search-routes";
import { searchTypes, type SearchGroup, type SearchResult, type SearchType } from "./search-schema";

const LISTBOX_ID = "search-results";

const searchCategories: Record<SearchType, { label: string; icon: LucideIcon }> = {
  project: { label: "Projects", icon: Target },
  area: { label: "Areas", icon: CirclePile },
  resource: { label: "Resources", icon: BookOpen },
  note: { label: "Notes", icon: NotebookPen },
  journal: { label: "Journal", icon: BookHeart },
  letter: { label: "Letters", icon: Feather },
  plan: { label: "Plans", icon: CalendarCheck },
  habit: { label: "Habits", icon: StarCheck },
  goal: { label: "Goals", icon: Flag },
};

const quickLinks: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/home", icon: House },
  { label: "Projects", href: "/projects", icon: Target },
  { label: "Areas", href: "/areas", icon: CirclePile },
  { label: "Resources", href: "/resources", icon: BookOpen },
  { label: "Notes", href: "/notes", icon: NotebookPen },
  { label: "Journal", href: "/journal", icon: BookHeart },
  { label: "Plans", href: "/plans", icon: CalendarCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

type PaletteOption =
  | { kind: "result"; key: string; result: SearchResult; group: SearchGroup }
  | { kind: "recent"; key: string; query: string }
  | { kind: "link"; key: string; label: string; href: string; icon: LucideIcon };

function highlight(value: string, query: string): ReactNode {
  const match = query.trim().toLocaleLowerCase();
  if (!match) return value;
  const lowerValue = value.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let position = 0;
  let index = lowerValue.indexOf(match);
  while (index !== -1) {
    if (index > position) parts.push(value.slice(position, index));
    parts.push(
      <mark key={index} className="rounded-sm bg-primary/15 text-foreground">
        {value.slice(index, index + match.length)}
      </mark>,
    );
    position = index + match.length;
    index = lowerValue.indexOf(match, position);
  }
  parts.push(value.slice(position));
  return parts;
}

function optionId(index: number) {
  return `${LISTBOX_ID}-option-${index}`;
}

function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2 px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
      <span className="flex min-w-0 items-center gap-1.5">{children}</span>
      {action}
    </div>
  );
}

function StateMessage({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}

type OptionRowProps = {
  index: number;
  active: boolean;
  disabled?: boolean;
  label?: string;
  onActivate: (index: number) => void;
  onSelect: () => void;
  children: ReactNode;
  trailing?: ReactNode;
};

function OptionRow({ index, active, disabled, label, onActivate, onSelect, children, trailing }: OptionRowProps) {
  return (
    <button
      id={optionId(index)}
      type="button"
      role="option"
      aria-label={label}
      aria-selected={active}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      tabIndex={-1}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors motion-reduce:transition-none",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
      onMouseMove={() => {
        if (!disabled && !active) onActivate(index);
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onSelect}
    >
      {children}
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {trailing}
        <CornerDownLeft
          className={cn("size-3.5 text-muted-foreground", !active && "invisible")}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

function OptionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

export function GlobalSearch({ userId }: { userId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchType>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentState, setRecentState] = useState<{
    userId?: number;
    values: string[];
  }>({ values: [] });
  const [shortcutModifier, setShortcutModifier] = useState("Ctrl");
  const recent = useMemo(
    () => (recentState.userId === userId ? recentState.values : []),
    [recentState, userId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecentState({ userId, values: readRecentSearches(userId) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShortcutModifier(/Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘" : "Ctrl");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openPalette = useCallback(() => {
    setActiveIndex(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    void queryClient.cancelQueries({ queryKey: ["search", userId] });
  }, [queryClient, userId]);

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openPalette();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [openPalette]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= 2;
  const isDebouncing = hasQuery && trimmedQuery !== debouncedQuery;
  const search = useGlobalSearch(userId, debouncedQuery, filter, false, open);
  const resultsAreCurrent =
    !isDebouncing &&
    !search.isPlaceholderData &&
    search.data?.data.query === debouncedQuery;
  const groups = useMemo(
    () =>
      (search.data?.data.groups ?? [])
        .filter((group) => group.items.length > 0)
        .sort((a, b) => searchTypes.indexOf(a.type) - searchTypes.indexOf(b.type)),
    [search.data],
  );
  const isLoading = search.isPending && !isDebouncing;
  const showSkeleton = hasQuery && (isLoading || (isDebouncing && groups.length === 0));
  const showResults = hasQuery && !search.isError && !showSkeleton;

  const options = useMemo<PaletteOption[]>(() => {
    if (!trimmedQuery) {
      return [
        ...recent.map((value) => ({ kind: "recent" as const, key: `recent:${value}`, query: value })),
        ...quickLinks.map((link) => ({ kind: "link" as const, key: `link:${link.href}`, ...link })),
      ];
    }
    if (!showResults) return [];
    return groups.flatMap((group) => group.items.map((result) => ({
      kind: "result" as const,
      key: `${result.type}:${result.id}`,
      result,
      group,
    })));
  }, [trimmedQuery, recent, showResults, groups]);

  const navigable = !hasQuery || resultsAreCurrent;
  const selectedIndex = navigable && options.length > 0
    ? Math.min(Math.max(activeIndex, 0), options.length - 1)
    : -1;
  const counts = useMemo(() => {
    if (filter !== undefined || !resultsAreCurrent) return null;
    return new Map(groups.map((group) => [group.type, group.total]));
  }, [filter, resultsAreCurrent, groups]);
  const totalResults = groups.reduce((sum, group) => sum + group.total, 0);

  useEffect(() => {
    if (!open || selectedIndex < 0) return;
    document.getElementById(optionId(selectedIndex))?.scrollIntoView({ block: "nearest" });
  }, [open, selectedIndex, options]);

  const onInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
  };

  const onFilterChange = (type: SearchType | undefined) => {
    setFilter(type);
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const navigate = (href: string) => {
    close();
    router.push(href);
  };

  const selectOption = (option: PaletteOption) => {
    if (option.kind === "recent") {
      onInputChange(option.query);
      inputRef.current?.focus();
      return;
    }
    if (option.kind === "link") {
      navigate(option.href);
      return;
    }
    if (!resultsAreCurrent) return;
    setRecentState({ userId, values: saveRecentSearch(userId, trimmedQuery) });
    setQuery("");
    setDebouncedQuery("");
    setFilter(undefined);
    setActiveIndex(0);
    navigate(searchResultHref(option.result));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && selectedIndex >= 0) {
      event.preventDefault();
      setActiveIndex((selectedIndex + 1) % options.length);
    } else if (event.key === "ArrowUp" && selectedIndex >= 0) {
      event.preventDefault();
      setActiveIndex((selectedIndex - 1 + options.length) % options.length);
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      selectOption(options[selectedIndex]);
    }
  };

  const renderOption = (option: PaletteOption, index: number) => {
    const active = index === selectedIndex;
    const common = {
      index,
      active,
      onActivate: setActiveIndex,
      onSelect: () => selectOption(option),
    };
    if (option.kind === "recent") {
      return (
        <OptionRow key={option.key} {...common}>
          <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 truncate text-sm">{option.query}</span>
        </OptionRow>
      );
    }
    if (option.kind === "link") {
      return (
        <OptionRow
          key={option.key}
          {...common}
          label={`Go to ${option.label}`}
        >
          <OptionIcon icon={option.icon} />
          <span className="min-w-0 truncate text-sm font-medium">{option.label}</span>
        </OptionRow>
      );
    }
    const { result, group } = option;
    const detail = result.snippet ?? result.subtitle;
    return (
      <OptionRow
        key={option.key}
        {...common}
        label={`${group.label}: ${result.title}`}
        disabled={!resultsAreCurrent}
        trailing={result.archived ? <Badge variant="outline">Archived</Badge> : undefined}
      >
        <OptionIcon icon={searchCategories[result.type].icon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{highlight(result.title, trimmedQuery)}</span>
          {detail && (
            <span className="truncate text-xs text-muted-foreground">
              {highlight(detail, trimmedQuery)}
            </span>
          )}
        </span>
      </OptionRow>
    );
  };

  let body: ReactNode;
  if (!trimmedQuery) {
    const recentOptions = options.filter((option) => option.kind === "recent");
    const linkOptions = options.filter((option) => option.kind === "link");
    body = (
      <div id={LISTBOX_ID} role="listbox" aria-label="Suggestions" className="flex flex-col gap-2">
        {recentOptions.length > 0 && (
          <div role="group" aria-label="Recent searches">
            <SectionLabel
              action={
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="-my-1 text-muted-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    clearRecentSearches(userId);
                    setRecentState({ userId, values: [] });
                    setActiveIndex(0);
                  }}
                >
                  Clear
                </Button>
              }
            >
              Recent searches
            </SectionLabel>
            {recentOptions.map((option, index) => renderOption(option, index))}
          </div>
        )}
        <div role="group" aria-label="Jump to">
          <SectionLabel>Jump to</SectionLabel>
          <div className="grid gap-0.5 sm:grid-cols-2">
            {linkOptions.map((option, index) => renderOption(option, recentOptions.length + index))}
          </div>
        </div>
      </div>
    );
  } else if (!hasQuery) {
    body = <StateMessage title="Keep typing to search" description="Enter at least two characters." />;
  } else if (showSkeleton) {
    body = (
      <div className="flex flex-col gap-3 p-3" aria-label="Loading search results">
        <Skeleton className="h-3 w-20" />
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (search.isError) {
    body = (
      <div role="alert">
        <StateMessage title="Search results could not be loaded." description="Check your connection and try again.">
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void search.refetch()}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            Try again
          </Button>
        </StateMessage>
      </div>
    );
  } else if (options.length === 0) {
    body = (
      <StateMessage
        title={`No results for “${trimmedQuery}”`}
        description={filter ? `Nothing in ${searchCategories[filter].label} matches.` : "Try a different word or check the spelling."}
      >
        {filter && (
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onFilterChange(undefined)}>
            Search all categories
          </Button>
        )}
      </StateMessage>
    );
  } else {
    let index = 0;
    body = (
      <div id={LISTBOX_ID} role="listbox" aria-label="Search results" className="flex flex-col gap-2">
        {groups.map((group) => {
          const Icon = searchCategories[group.type].icon;
          return (
            <div key={group.type} role="group" aria-label={group.label}>
              <SectionLabel action={<span className="tabular-nums">{group.total}</span>}>
                <Icon className="size-3.5" aria-hidden="true" />
                {group.label}
              </SectionLabel>
              {group.items.map(() => {
                const optionIndex = index++;
                return renderOption(options[optionIndex], optionIndex);
              })}
            </div>
          );
        })}
      </div>
    );
  }

  const statusText = !hasQuery
    ? null
    : search.isFetching || isDebouncing
      ? "Searching…"
      : resultsAreCurrent && !search.isError
        ? `${totalResults} ${totalResults === 1 ? "result" : "results"}`
        : null;

  return (
    <div className="relative flex min-w-0 items-center md:w-full md:max-w-[440px]">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="md:hidden"
        aria-label="Open search"
        aria-haspopup="dialog"
        onClick={openPalette}
      >
        <Search aria-hidden="true" />
      </Button>
      <button
        type="button"
        aria-label="Search everything"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        className="hidden h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-muted/40 pr-1.5 pl-3 text-sm text-muted-foreground shadow-xs transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none md:flex"
        onClick={openPalette}
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className={cn("min-w-0 flex-1 truncate text-left", query && "text-foreground")}>
          {query || "Search everything…"}
        </span>
        <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          <Kbd>{shortcutModifier}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) openPalette();
          else close();
        }}
      >
        <DialogContent
          showCloseButton={false}
          initialFocus={inputRef}
          className={cn(
            "top-[12vh] max-h-[min(76vh,40rem)] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0 data-ending-style:scale-[0.98] data-starting-style:scale-[0.98]",
            "max-md:inset-0 max-md:h-dvh max-md:max-h-dvh max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:rounded-none max-md:border-0",
          )}
        >
          <DialogTitle className="sr-only">Search</DialogTitle>
          <DialogDescription className="sr-only">
            Find projects, areas, resources, notes, and more in your workspace.
          </DialogDescription>

          <div className="flex shrink-0 items-center gap-2 border-b px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Search everything"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={options.length > 0 ? LISTBOX_ID : undefined}
              aria-activedescendant={selectedIndex >= 0 ? optionId(selectedIndex) : undefined}
              placeholder="Search projects, notes, plans…"
              maxLength={100}
              autoComplete="off"
              spellCheck={false}
              value={query}
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              onChange={(event) => onInputChange(event.target.value)}
              onKeyDown={onKeyDown}
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear search"
                onClick={() => {
                  onInputChange("");
                  inputRef.current?.focus();
                }}
              >
                <X aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              aria-label="Close search"
              onClick={close}
            >
              <span className="md:hidden">Cancel</span>
              <Kbd className="max-md:hidden">Esc</Kbd>
            </Button>
          </div>

          <div
            role="group"
            aria-label="Search categories"
            className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[undefined, ...searchTypes].map((type) => {
              const selected = filter === type;
              const count = type && counts?.get(type);
              return (
                <button
                  key={type ?? "all"}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                    counts && type && !count && !selected && "opacity-50",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onFilterChange(type)}
                >
                  {type ? searchCategories[type].label : "All"}
                  {count ? (
                    <span aria-hidden="true" className="tabular-nums opacity-70">{count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 md:min-h-72">
            {body}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            <span className="hidden items-center gap-3 sm:flex">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
              <span className="flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
            </span>
            <span className="ml-auto flex items-center gap-1.5" role="status" aria-live="polite">
              {statusText === "Searching…" && (
                <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              )}
              {statusText}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

