"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useArchiveResource,
  useResourcesQuery,
  useResourceTagsQuery,
} from "../queries/resource-query";
import type { Resource, ResourceType } from "../type";

export function useResourceList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState<ResourceType>();
  const [tag, setTag] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Resource>();
  const [archiving, setArchiving] = useState<Resource>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const archiveResource = useArchiveResource();
  const tagsQuery = useResourceTagsQuery();
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

  const {
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = resourcesQuery;

  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (
      !loadMoreElement ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void fetchNextPage();
      },
      { root: loadMoreElement.closest("main"), rootMargin: "200px" },
    );
    observer.observe(loadMoreElement);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

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

  return {
    archiveResource,
    archiving,
    clearFilters,
    confirmArchive,
    creating,
    isFiltered,
    loadMoreRef,
    resources,
    resourcesQuery,
    search,
    selected,
    setArchiving,
    setCreating,
    setSearch,
    setSelected,
    setTag,
    setType,
    tag,
    tagsQuery,
    type,
  };
}
