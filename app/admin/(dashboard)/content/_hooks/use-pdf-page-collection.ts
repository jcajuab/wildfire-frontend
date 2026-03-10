"use client";

import { useCallback, useState } from "react";
import { useLazyListContentQuery } from "@/lib/api/content-api";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { Content } from "@/types/content";

const CONTENT_PAGES_SHEET_PAGE_SIZE = 100;

export interface PageCollectionState {
  readonly items: readonly Content[];
  readonly total: number;
  readonly page: number;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly errorMessage: string | null;
}

const EMPTY_PAGE_COLLECTION: PageCollectionState = {
  items: [],
  total: 0,
  page: 0,
  isLoading: false,
  isLoadingMore: false,
  errorMessage: null,
};

const mergePageItems = (
  existingItems: readonly Content[],
  incomingItems: readonly Content[],
): readonly Content[] => {
  const merged = [...existingItems];
  for (const item of incomingItems) {
    const index = merged.findIndex((existing) => existing.id === item.id);
    if (index === -1) {
      merged.push(item);
      continue;
    }
    merged[index] = item;
  }
  return merged.sort((left, right) => {
    const leftPage = left.pageNumber ?? 0;
    const rightPage = right.pageNumber ?? 0;
    if (leftPage !== rightPage) {
      return leftPage - rightPage;
    }
    return left.createdAt.localeCompare(right.createdAt);
  });
};

export interface PdfPageCollectionState {
  readonly pageCollectionsByParentId: Record<string, PageCollectionState>;
  readonly updatePageCollection: (
    parentId: string,
    updater: (current: PageCollectionState) => PageCollectionState,
  ) => void;
  readonly setPageCollection: (
    parentId: string,
    nextCollection: PageCollectionState,
  ) => void;
  readonly handleLoadMorePages: (parentId: string) => Promise<void>;
  readonly handleRetryLoadPages: (parentId: string) => Promise<void>;
  readonly shouldLoadInitialPages: (parentId: string) => boolean;
  readonly loadInitialPages: (parentId: string) => Promise<void>;
}

/**
 * Manages PDF page collection state (data fetching, caching, pagination).
 * Handles loading, merging, and error states for PDF page collections.
 */
export function usePdfPageCollection(): PdfPageCollectionState {
  const [triggerListContent] = useLazyListContentQuery();
  const [pageCollectionsByParentId, setPageCollectionsByParentId] = useState<
    Record<string, PageCollectionState>
  >({});

  const updatePageCollection = useCallback(
    (
      parentId: string,
      updater: (current: PageCollectionState) => PageCollectionState,
    ) => {
      setPageCollectionsByParentId((previous) => {
        const current = previous[parentId];
        if (!current) {
          return previous;
        }
        return {
          ...previous,
          [parentId]: updater(current),
        };
      });
    },
    [],
  );

  const setPageCollection = useCallback(
    (parentId: string, nextCollection: PageCollectionState) => {
      setPageCollectionsByParentId((previous) => ({
        ...previous,
        [parentId]: nextCollection,
      }));
    },
    [],
  );

  const loadPageBatch = useCallback(
    async (input: { parentId: string; page: number; append: boolean }) => {
      setPageCollectionsByParentId((previous) => {
        const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
        return {
          ...previous,
          [input.parentId]: {
            ...current,
            isLoading: !input.append,
            isLoadingMore: input.append,
            errorMessage: null,
          },
        };
      });

      try {
        const response = await triggerListContent({
          page: input.page,
          pageSize: CONTENT_PAGES_SHEET_PAGE_SIZE,
          parentId: input.parentId,
          sortBy: "pageNumber",
          sortDirection: "asc",
        }).unwrap();
        const incomingItems = response.items.map(mapBackendContentToContent);
        setPageCollectionsByParentId((previous) => {
          const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
          return {
            ...previous,
            [input.parentId]: {
              ...current,
              items: input.append
                ? mergePageItems(current.items, incomingItems)
                : mergePageItems([], incomingItems),
              total: response.total,
              page: response.page,
              isLoading: false,
              isLoadingMore: false,
              errorMessage: null,
            },
          };
        });
      } catch (error) {
        setPageCollectionsByParentId((previous) => {
          const current = previous[input.parentId] ?? EMPTY_PAGE_COLLECTION;
          return {
            ...previous,
            [input.parentId]: {
              ...current,
              isLoading: false,
              isLoadingMore: false,
              errorMessage: getApiErrorMessage(
                error,
                "Failed to load PDF pages.",
              ),
            },
          };
        });
      }
    },
    [triggerListContent],
  );

  const handleLoadMorePages = useCallback(
    async (parentId: string) => {
      const currentCollection = pageCollectionsByParentId[parentId];
      if (!currentCollection) {
        await loadPageBatch({ parentId, page: 1, append: false });
        return;
      }
      if (
        currentCollection.isLoading ||
        currentCollection.isLoadingMore ||
        currentCollection.items.length >= currentCollection.total
      ) {
        return;
      }
      await loadPageBatch({
        parentId,
        page: currentCollection.page + 1,
        append: true,
      });
    },
    [loadPageBatch, pageCollectionsByParentId],
  );

  const handleRetryLoadPages = useCallback(
    async (parentId: string) => {
      await loadPageBatch({ parentId, page: 1, append: false });
    },
    [loadPageBatch],
  );

  const shouldLoadInitialPages = useCallback(
    (parentId: string) => {
      const currentCollection = pageCollectionsByParentId[parentId];
      return (
        !currentCollection ||
        (currentCollection.items.length === 0 &&
          !currentCollection.isLoading &&
          !currentCollection.isLoadingMore) ||
        currentCollection.errorMessage !== null
      );
    },
    [pageCollectionsByParentId],
  );

  const loadInitialPages = useCallback(
    async (parentId: string) => {
      await loadPageBatch({ parentId, page: 1, append: false });
    },
    [loadPageBatch],
  );

  return {
    pageCollectionsByParentId,
    updatePageCollection,
    setPageCollection,
    handleLoadMorePages,
    handleRetryLoadPages,
    shouldLoadInitialPages,
    loadInitialPages,
  };
}
