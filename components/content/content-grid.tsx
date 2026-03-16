"use client";

import { useMemo, type ReactElement } from "react";
import { IconFileUpload } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { ContentCard } from "./content-card";
import type { Content } from "@/types/content";
import { cn } from "@/lib/utils";

interface PageCollectionState {
  readonly items: readonly Content[];
  readonly total: number;
  readonly page: number;
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly errorMessage: string | null;
}

interface ContentGridProps {
  readonly items: readonly Content[];
  readonly expandedPdfParentIds: readonly string[];
  readonly pageCollectionsByParentId: Record<string, PageCollectionState>;
  readonly updatingPageId: string | null;
  readonly onTogglePdfExpand: (content: Content) => void;
  readonly onLoadMorePages: (parentId: string) => Promise<void>;
  readonly onRetryLoadPages: (parentId: string) => Promise<void>;
  readonly onTogglePageExclusion?: (
    page: Content,
    nextIsExcluded: boolean,
  ) => Promise<void>;
  readonly onEdit?: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete?: (content: Content) => void;
  readonly onDownload?: (content: Content) => void;
}

const buildLoadMoreLabel = (loaded: number, total: number): string => {
  if (total <= loaded) {
    return "All pages loaded";
  }
  return `Load ${Math.min(total - loaded, 100)} more`;
};

export function ContentGrid({
  items,
  expandedPdfParentIds,
  pageCollectionsByParentId,
  updatingPageId,
  onTogglePdfExpand,
  onLoadMorePages,
  onRetryLoadPages,
  onTogglePageExclusion,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
}: ContentGridProps): ReactElement {
  const expandedPdfParentIdSet = useMemo(
    () => new Set(expandedPdfParentIds),
    [expandedPdfParentIds],
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="No content yet"
        description="Upload a file or create content from scratch to start building playlists."
        icon={<IconFileUpload className="size-7" aria-hidden="true" />}
      />
    );
  }

  const renderPagePanel = (content: Content): ReactElement | null => {
    const collection = pageCollectionsByParentId[content.id];
    const isExpanded = expandedPdfParentIdSet.has(content.id);
    if (!isExpanded) {
      return null;
    }

    const hasPages = (collection?.items.length ?? 0) > 0;
    const canLoadMore =
      collection !== undefined &&
      collection.items.length < collection.total &&
      !collection.isLoading &&
      !collection.isLoadingMore;
    const remainingPages = collection
      ? Math.max(collection.total - collection.items.length, 0)
      : 0;

    return (
      <div
        id={`pdf-pages-${content.id}`}
        className={cn(
          "absolute left-full top-0 z-10 mt-0 w-[min(32rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card/95 p-3 ring-1 ring-border/30 transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
          "pointer-events-none opacity-0",
          isExpanded
            ? "pointer-events-auto opacity-100 translate-x-2"
            : "-translate-x-2",
        )}
        role="region"
        aria-label={`${content.title} page items`}
        aria-live={collection?.isLoading ? "polite" : "off"}
      >
        <h3 className="mb-3 truncate text-sm font-medium">{content.title}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Use the controls below to include, exclude, or edit page-level items.
        </p>

        {!collection || collection.isLoading ? (
          <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-primary/40 bg-background p-4">
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              Loading pages...
            </p>
          </div>
        ) : null}

        {!collection?.isLoading && collection?.errorMessage ? (
          <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <p role="alert" className="text-sm text-destructive">
              {collection.errorMessage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onRetryLoadPages(content.id);
              }}
              className="w-fit"
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!collection?.isLoading && !collection?.errorMessage && !hasPages ? (
          <div className="rounded-md border border-dashed border-border bg-background p-4">
            <p className="text-sm text-muted-foreground">
              No pages are available for this PDF.
            </p>
          </div>
        ) : null}

        {hasPages ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            {collection?.items.map((page) => (
              <ContentCard
                key={page.id}
                content={page}
                displayMode="pdf-page-item"
                isExclusionToggleDisabled={
                  page.status !== "READY" || updatingPageId === page.id
                }
                onToggleExclusion={onTogglePageExclusion}
                onEdit={onEdit}
                onPreview={onPreview}
                onDownload={onDownload}
              />
            ))}
          </div>
        ) : null}

        {canLoadMore ? (
          <div className="mt-3 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void onLoadMorePages(content.id);
              }}
            >
              {remainingPages > 0
                ? buildLoadMoreLabel(
                    collection?.items.length ?? 0,
                    collection?.total ?? 0,
                  )
                : "Load more pages"}
            </Button>
          </div>
        ) : null}

        {collection?.isLoadingMore ? (
          <div className="mt-3 flex items-center justify-center rounded-md border border-dashed border-primary/20 bg-background p-4">
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              Loading more pages...
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((content) => {
        const isPdfRoot = content.type === "PDF" && content.kind === "ROOT";
        const canExpand = isPdfRoot && content.status === "READY";
        const isExpanded = expandedPdfParentIdSet.has(content.id);

        return (
          <div key={content.id} id={`content-card-${content.id}`} className="relative">
            <ContentCard
              content={content}
              isPdfRootExpandable={canExpand}
              isPdfRootExpanded={isExpanded}
              onTogglePdfRootExpand={onTogglePdfExpand}
              onEdit={onEdit}
              onPreview={onPreview}
              onDelete={onDelete}
              onDownload={onDownload}
            />

            {isPdfRoot ? renderPagePanel(content) : null}
          </div>
        );
      })}
    </div>
  );
}
