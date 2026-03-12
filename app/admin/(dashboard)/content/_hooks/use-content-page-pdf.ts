"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  contentApi,
  useSetContentExclusionMutation,
} from "@/lib/api/content-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { useAppDispatch } from "@/lib/hooks";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";
import type { Content } from "@/types/content";
import { usePdfExpansionState } from "./use-pdf-expansion-state";
import {
  type PageCollectionState,
  usePdfPageCollection,
} from "./use-pdf-page-collection";

export type { PageCollectionState } from "./use-pdf-page-collection";

export interface ContentPagePdfState {
  readonly expandedPdfParentIds: string[];
  readonly pageCollectionsByParentId: Record<string, PageCollectionState>;
  readonly updatingPageId: string | null;
  readonly handleTogglePdfExpand: (content: Content) => void;
  readonly handleLoadMorePages: (parentId: string) => Promise<void>;
  readonly handleRetryLoadPages: (parentId: string) => Promise<void>;
  readonly handleTogglePageExclusion: (
    pageContent: Content,
    isExcluded: boolean,
  ) => Promise<void>;
  readonly updatePageCollection: (
    parentId: string,
    updater: (current: PageCollectionState) => PageCollectionState,
  ) => void;
  readonly setPageCollection: (
    parentId: string,
    nextCollection: PageCollectionState,
  ) => void;
}

/**
 * Orchestrates PDF expansion and page collection management.
 * Wires together expansion state, page collection, and page exclusion logic.
 */
export function useContentPagePdfState(): ContentPagePdfState {
  const dispatch = useAppDispatch();
  const [setContentExclusion] = useSetContentExclusionMutation();
  const [updatingPageId, setUpdatingPageId] = useState<string | null>(null);

  const expansionState = usePdfExpansionState();
  const pageCollection = usePdfPageCollection();

  const handleTogglePdfExpand = useCallback(
    (content: Content) => {
      expansionState.handleTogglePdfExpand(content, (parentId) => {
        if (pageCollection.shouldLoadInitialPages(parentId)) {
          void pageCollection.loadInitialPages(parentId);
        }
      });
    },
    [expansionState, pageCollection],
  );

  const handleTogglePageExclusion = useCallback(
    async (pageContent: Content, isExcluded: boolean) => {
      const parentContentId = pageContent.parentContentId;
      if (!parentContentId) {
        return;
      }
      const previousIsExcluded = pageContent.isExcluded;
      const previousCollection =
        pageCollection.pageCollectionsByParentId[parentContentId];
      setUpdatingPageId(pageContent.id);
      pageCollection.updatePageCollection(parentContentId, (current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === pageContent.id ? { ...item, isExcluded } : item,
        ),
      }));
      try {
        const updatedPage = mapBackendContentToContent(
          await setContentExclusion({
            id: pageContent.id,
            isExcluded,
          }).unwrap(),
        );
        pageCollection.updatePageCollection(parentContentId, (current) => ({
          ...current,
          items: current.items.map((item) =>
            item.id === updatedPage.id
              ? {
                  ...updatedPage,
                  thumbnailUrl:
                    updatedPage.thumbnailUrl ?? item.thumbnailUrl,
                }
              : item,
          ),
        }));
        const tags = [
          { type: "Content" as const, id: "LIST" },
          { type: "Content" as const, id: pageContent.id },
        ];
        tags.push({
          type: "Content" as const,
          id: parentContentId,
        });
        dispatch(contentApi.util.invalidateTags(tags));
        toast.success(
          isExcluded
            ? "Page excluded from playback."
            : "Page included in playback.",
        );
      } catch (error) {
        if (previousCollection) {
          pageCollection.setPageCollection(parentContentId, previousCollection);
        } else {
          pageCollection.updatePageCollection(parentContentId, (current) => ({
            ...current,
            items: current.items.map((item) =>
              item.id === pageContent.id
                ? { ...item, isExcluded: previousIsExcluded }
                : item,
            ),
          }));
        }
        notifyApiError(error, "Failed to update page exclusion.");
      } finally {
        setUpdatingPageId(null);
      }
    },
    [dispatch, pageCollection, setContentExclusion],
  );

  return {
    expandedPdfParentIds: expansionState.expandedPdfParentIds,
    pageCollectionsByParentId: pageCollection.pageCollectionsByParentId,
    updatingPageId,
    handleTogglePdfExpand,
    handleLoadMorePages: pageCollection.handleLoadMorePages,
    handleRetryLoadPages: pageCollection.handleRetryLoadPages,
    handleTogglePageExclusion,
    updatePageCollection: pageCollection.updatePageCollection,
    setPageCollection: pageCollection.setPageCollection,
  };
}
