"use client";

import type { ReactElement, ReactNode } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { IconPhoto, IconPlus } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SearchControl } from "@/components/common/search-control";
import { RequiredLabel } from "@/components/common/required-label";
import { Badge } from "@/components/ui/badge";
import { getTextThumbnailText } from "@/lib/content-thumbnail-preview";
import { formatDuration } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SortableItemRow, type DraftItem } from "./sortable-item-row";
import type { PlaylistSelectableContent } from "./create-playlist-form";

const getDefaultItemDuration = (content: PlaylistSelectableContent) =>
  content.duration != null && content.duration > 0 ? content.duration : 5;

const getNormalizedItemDuration = (
  item: DraftItem,
  duration: number,
): number => {
  const maxDuration =
    item.content.type === "VIDEO" &&
    item.content.duration != null &&
    item.content.duration > 0
      ? item.content.duration
      : Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.min(duration, maxDuration));
};

export const getPlaylistItemLoop = (content: {
  readonly type: string;
}): boolean => content.type === "VIDEO";

export interface PlaylistFormBodyProps {
  readonly name: string;
  readonly onNameChange: (value: string) => void;
  readonly description: string;
  readonly onDescriptionChange: (value: string) => void;
  readonly items: DraftItem[];
  readonly onItemsChange: (items: DraftItem[]) => void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly contentSearch?: string;
  readonly onContentSearchChange?: (value: string) => void;
  readonly isContentLibraryLoading?: boolean;
  readonly isContentLibraryFetching?: boolean;
  readonly hasMoreContent?: boolean;
  readonly onLoadMoreContent?: () => void;
  readonly isOverDurationLimit: boolean;
  /** Optional action slot rendered in the Playlist Items section header. */
  readonly itemsHeaderSlot?: ReactNode;
  /** Optional status slot rendered below the Playlist Items section header. */
  readonly itemsStatusSlot?: ReactNode;
  /** Optional helper copy rendered under the Playlist Items heading. */
  readonly itemsSubtitleSlot?: ReactNode;
  /** Empty state message shown when no items have been added */
  readonly emptyItemsMessage?: string;
  /** When true, all fields are non-interactive (e.g. while creating the playlist). */
  readonly disabled?: boolean;
}

export interface PlaylistDurationBudgetProps {
  readonly itemCount: number;
  readonly totalDuration: number;
  readonly durationLimit: number;
  readonly className?: string;
}

export function PlaylistDurationBudget({
  itemCount,
  totalDuration,
  durationLimit,
  className,
}: PlaylistDurationBudgetProps): ReactElement {
  const percentage =
    durationLimit > 0
      ? Math.min(100, Math.round((totalDuration / durationLimit) * 100))
      : 0;
  const isOverLimit = totalDuration > durationLimit;

  return (
    <div
      className={cn(
        "grid gap-3 rounded-md border px-3 py-2 md:grid-cols-[auto_minmax(12rem,1fr)_auto] md:items-center",
        isOverLimit
          ? "border-destructive/20 bg-destructive/5"
          : "border-border bg-background",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-background font-normal">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </Badge>
        <Badge
          variant={isOverLimit ? "destructive" : "outline"}
          className="bg-background font-normal tabular-nums"
        >
          {formatDuration(totalDuration)} / {formatDuration(durationLimit)}
        </Badge>
      </div>
      <div
        aria-label="Playlist duration budget"
        className="h-2 min-w-0 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width]",
            isOverLimit && "bg-destructive",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isOverLimit ? (
        <p className="text-xs font-medium text-destructive md:text-right">
          Over 60 second limit
        </p>
      ) : null}
    </div>
  );
}

export function PlaylistFormBody({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  items,
  onItemsChange,
  availableContent,
  contentSearch,
  onContentSearchChange,
  isContentLibraryLoading = false,
  isContentLibraryFetching = false,
  hasMoreContent = false,
  onLoadMoreContent,
  isOverDurationLimit,
  itemsHeaderSlot,
  itemsStatusSlot,
  itemsSubtitleSlot,
  emptyItemsMessage = "Add content from the library to get started",
  disabled = false,
}: PlaylistFormBodyProps): ReactElement {
  const [localContentSearch, setLocalContentSearch] = useState("");
  const controlledContentSearch =
    contentSearch !== undefined && onContentSearchChange !== undefined;
  const effectiveContentSearch = controlledContentSearch
    ? (contentSearch ?? "")
    : localContentSearch;
  const handleContentSearchChange = controlledContentSearch
    ? onContentSearchChange
    : setLocalContentSearch;
  const loadMoreContentRef = useRef(onLoadMoreContent);
  const contentSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadMoreContentRef.current = onLoadMoreContent;
  }, [onLoadMoreContent]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: disabled ? 9999 : 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddContent = useCallback(
    (content: PlaylistSelectableContent) => {
      const newItem: DraftItem = {
        id: `draft-${Date.now()}-${content.id}`,
        content,
        duration: getDefaultItemDuration(content),
        sequence: items.length + 1,
        loop: getPlaylistItemLoop(content),
      };
      onItemsChange([...items, newItem]);
    },
    [items, onItemsChange],
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      onItemsChange(items.filter((item) => item.id !== itemId));
    },
    [items, onItemsChange],
  );

  const handleUpdateDuration = useCallback(
    (itemId: string, duration: number) => {
      onItemsChange(
        items.map((item) =>
          item.id === itemId
            ? { ...item, duration: getNormalizedItemDuration(item, duration) }
            : item,
        ),
      );
    },
    [items, onItemsChange],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        onItemsChange(arrayMove(items, oldIndex, newIndex));
      }
    },
    [items, onItemsChange],
  );

  const filteredContent = useMemo(() => {
    const addedIds = new Set(items.map((item) => item.content.id));
    return availableContent.filter((content) => {
      const matchesSearch =
        controlledContentSearch ||
        content.title
          .toLowerCase()
          .includes(effectiveContentSearch.toLowerCase());
      return matchesSearch && !addedIds.has(content.id);
    });
  }, [
    availableContent,
    controlledContentSearch,
    effectiveContentSearch,
    items,
  ]);

  useEffect(() => {
    if (!hasMoreContent) return;
    const sentinel = contentSentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          loadMoreContentRef.current?.();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreContent, isContentLibraryFetching]);

  const libraryEmptyMessage = isContentLibraryLoading
    ? "Loading content..."
    : availableContent.length === 0
      ? "No content available"
      : effectiveContentSearch.trim().length > 0
        ? "No matching content"
        : "All available content has been added";

  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:overflow-hidden">
      <div className="flex min-h-0 flex-col gap-4 xl:overflow-hidden">
        <section className="overflow-hidden rounded-md border border-border bg-background">
          <div className="flex items-center border-b border-border bg-muted/15 p-4">
            <h2 className="text-sm font-semibold">Playlist Information</h2>
          </div>

          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="playlist-name">
                Playlist Name
              </RequiredLabel>
              <Input
                id="playlist-name"
                placeholder="Enter playlist name"
                value={name}
                disabled={disabled}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playlist-description">Description</Label>
              <Textarea
                id="playlist-description"
                placeholder="Describe the playlist purpose or playback context"
                rows={3}
                value={description}
                disabled={disabled}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-md border border-border bg-background xl:min-h-0 xl:flex-1">
          <div className="flex flex-col gap-3 border-b border-border bg-muted/15 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">Playlist Items</h2>
              {itemsSubtitleSlot}
            </div>
            {itemsHeaderSlot ? (
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {itemsHeaderSlot}
              </div>
            ) : null}
          </div>

          {itemsStatusSlot ? (
            <div className="border-b border-border bg-background p-4">
              {itemsStatusSlot}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-2 p-4 xl:overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.length === 0 ? (
                  <div className="flex min-h-64 flex-1 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    <span>{emptyItemsMessage}</span>
                  </div>
                ) : (
                  items.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      onRemove={handleRemoveItem}
                      onUpdateDuration={handleUpdateDuration}
                      disabled={disabled}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </div>
        </section>
      </div>

      <aside className="flex w-full flex-col overflow-hidden rounded-md border border-border bg-background xl:min-h-0 xl:w-80">
        <div className="flex items-center border-b border-border bg-muted/15 p-4">
          <h2 className="text-sm font-semibold">Content Library</h2>
        </div>

        <div className="border-b border-border p-4">
          <SearchControl
            value={effectiveContentSearch}
            onChange={handleContentSearchChange}
            placeholder="Search content library"
            ariaLabel="Search content library"
            className="max-w-none"
            disabled={disabled}
          />
        </div>

        <div className="flex min-h-64 flex-1 flex-col gap-2 p-4 xl:min-h-0 xl:overflow-y-auto">
          {filteredContent.length === 0 && !hasMoreContent ? (
            <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
              {libraryEmptyMessage}
            </div>
          ) : (
            <>
              {filteredContent.map((content) => (
                <button
                  key={content.id}
                  type="button"
                  aria-label={content.title}
                  onClick={() => handleAddContent(content)}
                  disabled={disabled || isOverDurationLimit}
                  className={`focus-visible:ring-ring flex items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 ${disabled || isOverDurationLimit ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <div
                    data-testid={`content-library-thumbnail-${content.id}`}
                    className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted"
                  >
                    {content.thumbnailUrl ? (
                      <Image
                        src={content.thumbnailUrl}
                        alt={`${content.title} thumbnail`}
                        fill
                        className="object-cover"
                      />
                    ) : content.type === "TEXT" &&
                      (content.textPreviewText || content.textHtmlContent) ? (
                      <div className="flex size-full items-start overflow-hidden p-1">
                        <p className="line-clamp-4 text-[6px] leading-tight text-foreground">
                          {getTextThumbnailText(content)}
                        </p>
                      </div>
                    ) : (
                      <IconPhoto
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span className="flex-1 truncate text-sm">
                    {content.title}
                  </span>
                  <IconPlus
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              ))}
              {hasMoreContent ? (
                <div
                  ref={contentSentinelRef}
                  className="flex min-h-12 items-center justify-center text-xs text-muted-foreground"
                >
                  {isContentLibraryFetching ? "Loading more..." : "Load more"}
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
