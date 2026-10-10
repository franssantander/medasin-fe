"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  useArchiveResource,
  useDeleteResource,
  useResourcesQuery,
  useResourceTagsQuery,
} from "../queries/resource-query";
import type { Resource, ResourceType } from "../type";

export type ResourceView = "grid" | "list";

const VIEW_STORAGE_KEY = "medasin.resources.view";
const viewListeners = new Set<() => void>();

function readStoredView(): ResourceView {
  try {
    return window.localStorage.getItem(VIEW_STORAGE_KEY) === "list"
      ? "list"
      : "grid";
  } catch {
    return "grid";
  }
}

function subscribeToView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function storeView(view: ResourceView) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  viewListeners.forEach((listener) => listener());
}

export function useResourceList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ResourceType>();
  const [tag, setTag] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Resource>();
  const [archiving, setArchiving] = useState<Resource>();
  const [deleting, setDeleting] = useState<Resource>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const archiveResource = useArchiveResource();
  const deleteResource = useDeleteResource();
  const tagsQuery = useResourceTagsQuery();
  const view = useSyncExternalStore(
    subscribeToView,
    readStoredView,
    () => "grid" as const,
  );
  const resourcesQuery = useResourcesQuery({
    search: debouncedSearch || undefined,
    type,
    tag_uuid: tag,
  });

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  // When filters change while scrolled down, bring the top of the results
  // back into view so the new list doesn't start off-screen.
  useEffect(() => {
    const results = resultsRef.current;
    const main = results?.closest("main");
    if (!results || !main) return;
    if (results.getBoundingClientRect().top < main.getBoundingClientRect().top) {
      results.scrollIntoView({ block: "start" });
    }
  }, [debouncedSearch, type, tag]);

  const {
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
  } = resourcesQuery;

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (
      !loadMoreElement ||
      !hasNextPage ||
      isFetching ||
      isFetchNextPageError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { root: loadMoreElement.closest("main"), rootMargin: "200px 0px" },
    );
    observer.observe(loadMoreElement);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching, isFetchNextPageError]);

  const resources = useMemo(
    () => [
      ...new Map(
        resourcesQuery.data?.pages
          .flatMap((page) => page.data.data)
          .map((resource) => [resource.uuid, resource]),
      ).values(),
    ],
    [resourcesQuery.data],
  );
  const isFiltered = Boolean(search || type || tag);
  const isSearching = Boolean(search) && isFetching && !isFetchingNextPage;
  const activeFilterCount = Number(Boolean(type)) + Number(Boolean(tag));
  const selectedTag = tagsQuery.data?.data.find((item) => item.uuid === tag);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setType(undefined);
    setTag(undefined);
  };

  const confirmArchive = () => {
    if (!archiving) return;
    archiveResource.mutate(archiving.uuid, {
      onSuccess: () => setArchiving(undefined),
    });
  };
  const confirmDelete = () => {
    if (!deleting) return;
    deleteResource.mutate(deleting.uuid, {
      onSuccess: () => setDeleting(undefined),
    });
  };

  return {
    archiveResource,
    activeFilterCount,
    archiving,
    clearFilters,
    confirmArchive,
    confirmDelete,
    creating,
    deleting,
    deleteResource,
    isFiltered,
    isSearching,
    loadMoreRef,
    resultsRef,
    resources,
    resourcesQuery,
    search,
    selectedTag,
    selected,
    setArchiving,
    setCreating,
    setDeleting,
    setSearch,
    setSelected,
    setTag,
    setType,
    setView: storeView,
    tag,
    tagsQuery,
    type,
    view,
  };
}
