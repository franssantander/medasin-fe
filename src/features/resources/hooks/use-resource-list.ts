"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useArchiveResource,
  useDeleteResource,
  useResourcesQuery,
  useResourceTagsQuery,
} from "../queries/resource-query";
import type { Resource, ResourceType } from "../type";

const DESKTOP_MEDIA_QUERY = "(min-width: 64rem)";

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
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const archiveResource = useArchiveResource();
  const deleteResource = useDeleteResource();
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

  useEffect(() => {
    if (window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
      resultsScrollRef.current?.scrollTo({ top: 0 });
    }
  }, [debouncedSearch, type, tag]);

  const {
    fetchNextPage,
    hasNextPage,
    isFetching,
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

    const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) void fetchNextPage();
        },
        {
          root: desktopMedia.matches
            ? resultsScrollRef.current
            : loadMoreElement.closest("main"),
          rootMargin: "200px 0px",
        },
      );
      observer.observe(loadMoreElement);
    };

    observe();
    desktopMedia.addEventListener("change", observe);
    return () => {
      observer.disconnect();
      desktopMedia.removeEventListener("change", observe);
    };
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
    loadMoreRef,
    resultsScrollRef,
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
    tag,
    tagsQuery,
    type,
  };
}
