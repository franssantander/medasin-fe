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
  LoaderCircle,
  NotebookPen,
  RefreshCw,
  Search,
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { clearRecentSearches, readRecentSearches, saveRecentSearch } from "./recent-searches";
import { useGlobalSearch } from "./search-query";
import { searchResultHref } from "./search-routes";
import { searchTypes, type SearchGroup, type SearchResult, type SearchType } from "./search-schema";

const searchCategories: Record<SearchType, { label: string; icon: LucideIcon }> = {
  project: { label: "Projects", icon: Target },
  area: { label: "Areas", icon: CirclePile },
  resource: { label: "Resources", icon: BookOpen },
  note: { label: "Notes", icon: NotebookPen },
  journal: { label: "Journal", icon: BookHeart },
  letter: { label: "Letters", icon: Feather },
  plan: { label: "Plans", icon: CalendarCheck },
  habit: { label: "Habits", icon: StarCheck },
  goal: { label: "Goals", icon: StarCheck },
};

type Option = {
  result: SearchResult;
  group: SearchGroup;
};

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

type SearchPanelProps = {
  id: string;
  className?: string;
  query: string;
  filter: SearchType | undefined;
  groups: SearchGroup[];
  options: Option[];
  activeIndex: number;
  recent: string[];
  isDebouncing: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  resultsAreCurrent: boolean;
  onFilterChange: (type: SearchType | undefined) => void;
  onRecentSelect: (query: string) => void;
  onRecentClear: () => void;
  onResultSelect: (result: SearchResult) => void;
  onRetry: () => void;
  onActiveChange: (index: number) => void;
};

function SearchPanel({
  id,
  className,
  query,
  filter,
  groups,
  options,
  activeIndex,
  recent,
  isDebouncing,
  isLoading,
  isFetching,
  isError,
  resultsAreCurrent,
  onFilterChange,
  onRecentSelect,
  onRecentClear,
  onResultSelect,
  onRetry,
  onActiveChange,
}: SearchPanelProps) {
  const trimmed = query.trim();
  const hasQuery = trimmed.length >= 2;
  const showResults = hasQuery && !isError && !isLoading;
  let optionIndex = 0;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        role="group"
        aria-label="Search categories"
        className="flex shrink-0 gap-1 overflow-x-auto border-b px-3 py-2 [scrollbar-width:thin]"
      >
        <Button
          type="button"
          size="xs"
          variant={filter === undefined ? "secondary" : "ghost"}
          aria-pressed={filter === undefined}
          onClick={() => onFilterChange(undefined)}
        >
          All
        </Button>
        {searchTypes.map((type) => (
          <Button
            key={type}
            type="button"
            size="xs"
            variant={filter === type ? "secondary" : "ghost"}
            aria-pressed={filter === type}
            onClick={() => onFilterChange(type)}
          >
            {searchCategories[type].label}
          </Button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {!trimmed && recent.length > 0 ? (
          <section aria-label="Recent searches" className="px-1 py-1">
            <div className="flex items-center justify-between px-2 pb-2">
              <h2 className="text-xs font-semibold text-muted-foreground">Recent searches</h2>
              <Button type="button" size="xs" variant="ghost" onClick={onRecentClear}>
                Clear
              </Button>
            </div>
            <div className="flex flex-col gap-0.5">
              {recent.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => onRecentSelect(value)}
                >
                  <Clock3 data-icon="inline-start" aria-hidden="true" />
                  <span className="truncate">{value}</span>
                </Button>
              ))}
            </div>
          </section>
        ) : !hasQuery ? (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {trimmed ? "Keep typing to search" : "Find anything in your workspace"}
            </p>
            <p className="text-xs text-muted-foreground">
              {trimmed ? "Enter at least two characters." : "Search notes, projects, areas, and more."}
            </p>
          </div>
        ) : isLoading || (isDebouncing && groups.length === 0) ? (
          <div className="flex flex-col gap-3 p-3" aria-label="Loading search results">
            <Skeleton className="h-3 w-20" />
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-md px-1 py-1">
                <Skeleton className="size-8 shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-start gap-3 px-4 py-6" role="alert">
            <p className="text-sm">Search results could not be loaded.</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : showResults && options.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Search className="size-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">No results for “{trimmed}”</p>
            <p className="text-xs text-muted-foreground">
              Try a different word or choose another category.
            </p>
          </div>
        ) : showResults ? (
          <div id={id} role="listbox" aria-label="Search results" className="flex flex-col gap-3">
            {groups.map((group) => {
              const Icon = searchCategories[group.type].icon;
              return (
                <div key={group.type} role="group" aria-label={group.label}>
                  <div className="flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Icon className="size-3.5" aria-hidden="true" />
                      {group.label}
                    </span>
                    <span>{group.total}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((result) => {
                      const index = optionIndex++;
                      return (
                        <button
                          key={`${result.type}:${result.id}`}
                          id={`${id}-option-${index}`}
                          type="button"
                          role="option"
                          aria-label={`${group.label}: ${result.title}`}
                          aria-selected={activeIndex === index}
                          aria-disabled={!resultsAreCurrent}
                          disabled={!resultsAreCurrent}
                          tabIndex={-1}
                          className={cn(
                            "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring",
                            activeIndex === index && "bg-accent text-accent-foreground",
                          )}
                          onMouseEnter={() => {
                            if (resultsAreCurrent) onActiveChange(index);
                          }}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => onResultSelect(result)}
                        >
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {highlight(result.title, trimmed)}
                            </span>
                            {result.archived && <Badge variant="outline">Archived</Badge>}
                            {activeIndex === index && resultsAreCurrent && (
                              <CornerDownLeft
                                className="size-3.5 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                          {result.subtitle && (
                            <span className="w-full truncate text-xs text-muted-foreground">
                              {highlight(result.subtitle, trimmed)}
                            </span>
                          )}
                          {result.snippet && (
                            <span className="w-full truncate text-xs text-muted-foreground">
                              {highlight(result.snippet, trimmed)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          {hasQuery ? (
            <>
              {(isFetching || isDebouncing) && <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />}
              {isFetching || isDebouncing ? "Searching…" : options.length > 0 ? `${options.length} shown` : "Ready"}
            </>
          ) : "Search everything"}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {options.length > 0 && resultsAreCurrent && (
            <span className="hidden items-center gap-1 sm:flex">
              <Kbd>↑</Kbd><Kbd>↓</Kbd>
              {activeIndex >= 0 && <><Kbd>Enter</Kbd> open</>}
            </span>
          )}
          <Kbd>Esc</Kbd> close
        </span>
      </div>
    </div>
  );
}

export function GlobalSearch({ userId }: { userId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchType>();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentState, setRecentState] = useState<{
    userId?: number;
    values: string[];
  }>({ values: [] });
  const [shortcutModifier, setShortcutModifier] = useState("Ctrl");
  const recent = recentState.userId === userId ? recentState.values : [];

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

  const close = useCallback(() => {
    setDesktopOpen(false);
    setMobileOpen(false);
    void queryClient.cancelQueries({ queryKey: ["search", userId] });
  }, [queryClient, userId]);

  useEffect(() => {
    const onShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) {
          setDesktopOpen(true);
          desktopInputRef.current?.focus();
        } else {
          setMobileOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const frame = window.requestAnimationFrame(() => mobileInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mobileOpen]);

  useEffect(() => {
    if (!desktopOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [desktopOpen, close]);

  const trimmedQuery = query.trim();
  const isOpen = desktopOpen || mobileOpen;
  const isDebouncing = trimmedQuery.length >= 2 && trimmedQuery !== debouncedQuery;
  const search = useGlobalSearch(userId, debouncedQuery, filter, false, isOpen);
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
  const options = useMemo<Option[]>(
    () => groups.flatMap((group) => group.items.map((result) => ({
      result,
      group,
    }))),
    [groups],
  );
  const selectedIndex =
    resultsAreCurrent && activeIndex >= 0 && activeIndex < options.length
      ? activeIndex
      : -1;
  const hasMountedListbox =
    trimmedQuery.length >= 2 &&
    !search.isError &&
    !(search.isPending && !isDebouncing) &&
    !(isDebouncing && groups.length === 0) &&
    options.length > 0;

  useEffect(() => {
    if (selectedIndex < 0 || !hasMountedListbox) return;
    const prefix = mobileOpen ? "mobile" : "desktop";
    document
      .getElementById(`${prefix}-search-results-option-${selectedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, mobileOpen, hasMountedListbox]);

  const selectResult = (result: SearchResult) => {
    if (!resultsAreCurrent) return;
    setRecentState({ userId, values: saveRecentSearch(userId, trimmedQuery) });
    setQuery("");
    setDebouncedQuery("");
    setFilter(undefined);
    setActiveIndex(-1);
    close();
    router.push(searchResultHref(result));
  };

  const onInputChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
  };

  const onFilterChange = (type: SearchType | undefined) => {
    setFilter(type);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      event.currentTarget.blur();
    } else if (event.key === "ArrowDown" && resultsAreCurrent && options.length > 0) {
      event.preventDefault();
      setActiveIndex((value) => (value + 1) % options.length);
    } else if (event.key === "ArrowUp" && resultsAreCurrent && options.length > 0) {
      event.preventDefault();
      setActiveIndex((value) => (value - 1 + options.length) % options.length);
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      selectResult(options[selectedIndex].result);
    }
  };

  const panelProps = {
    query,
    filter,
    groups,
    options,
    activeIndex: selectedIndex,
    recent,
    isDebouncing,
    isLoading: search.isPending && !isDebouncing,
    isFetching: search.isFetching,
    isError: search.isError,
    resultsAreCurrent,
    onFilterChange,
    onRecentSelect: onInputChange,
    onRecentClear: () => {
      clearRecentSearches(userId);
      setRecentState({ userId, values: [] });
    },
    onResultSelect: selectResult,
    onRetry: () => void search.refetch(),
    onActiveChange: setActiveIndex,
  };

  return (
    <div ref={rootRef} className="relative flex min-w-0 items-center md:w-full md:max-w-[440px]">
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="md:hidden"
        aria-label="Open search"
        onClick={() => setMobileOpen(true)}
      >
        <Search aria-hidden="true" />
      </Button>
      <div className="hidden w-full md:block">
        <InputGroup>
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput
            ref={desktopInputRef}
            type="search"
            role="combobox"
            aria-label="Search everything"
            aria-autocomplete="list"
            aria-expanded={desktopOpen}
            aria-controls={desktopOpen && hasMountedListbox ? "desktop-search-results" : undefined}
            aria-activedescendant={desktopOpen && hasMountedListbox && selectedIndex >= 0 ? `desktop-search-results-option-${selectedIndex}` : undefined}
            placeholder="Search everything…"
            maxLength={100}
            value={query}
            onFocus={() => setDesktopOpen(true)}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <InputGroupAddon align="inline-end">
            {query ? (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Clear search" onClick={() => onInputChange("")}>
                <X aria-hidden="true" />
              </Button>
            ) : (
              <><Kbd>{shortcutModifier}</Kbd><Kbd>K</Kbd></>
            )}
          </InputGroupAddon>
        </InputGroup>
        {desktopOpen && (
          <div className="absolute top-full left-0 mt-2 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <SearchPanel id="desktop-search-results" className="max-h-[340px]" {...panelProps} />
          </div>
        )}
      </div>
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (open) setMobileOpen(true);
          else close();
        }}
      >
        <SheetContent side="top" className="h-dvh max-h-dvh w-full gap-0 p-0 md:hidden">
          <SheetHeader className="shrink-0 border-b pr-14">
            <SheetTitle>Search</SheetTitle>
            <SheetDescription>Find anything in your workspace.</SheetDescription>
          </SheetHeader>
          <div className="shrink-0 p-3">
            <InputGroup>
              <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
              <InputGroupInput
                ref={mobileInputRef}
                type="search"
                role="combobox"
                aria-label="Search everything"
                aria-autocomplete="list"
                aria-expanded={mobileOpen}
                aria-controls={mobileOpen && hasMountedListbox ? "mobile-search-results" : undefined}
                aria-activedescendant={mobileOpen && hasMountedListbox && selectedIndex >= 0 ? `mobile-search-results-option-${selectedIndex}` : undefined}
                placeholder="Search everything…"
                maxLength={100}
                value={query}
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={onKeyDown}
              />
              {query && (
                <InputGroupAddon align="inline-end">
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Clear search" onClick={() => onInputChange("")}>
                    <X aria-hidden="true" />
                  </Button>
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
          <SearchPanel id="mobile-search-results" className="flex-1" {...panelProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
