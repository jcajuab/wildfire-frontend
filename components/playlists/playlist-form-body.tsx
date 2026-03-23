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
import {
  IconInfoCircle,
  IconPhoto,
  IconPlaylist,
  IconPlus,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import { SearchControl } from "@/components/common/search-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SortableItemRow, type DraftItem } from "./sortable-item-row";
import type { PlaylistSelectableContent } from "./create-playlist-form";

export interface PlaylistFormBodyProps {
  readonly name: string;
  readonly onNameChange: (value: string) => void;
  readonly description: string;
  readonly onDescriptionChange: (value: string) => void;
  readonly items: DraftItem[];
  readonly onItemsChange: (items: DraftItem[]) => void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly isOverDurationLimit: boolean;
  /** Optional slot rendered in the Playlist Items section header (e.g. duration summary) */
  readonly itemsHeaderSlot?: ReactNode;
  /** Empty state message shown when no items have been added */
  readonly emptyItemsMessage?: string;
}

export function PlaylistFormBody({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  items,
  onItemsChange,
  availableContent,
  isOverDurationLimit,
  itemsHeaderSlot,
  emptyItemsMessage = "Add content from the library to get started",
}: PlaylistFormBodyProps): ReactElement {
  const [contentSearch, setContentSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddContent = useCallback(
    (content: PlaylistSelectableContent) => {
      const newItem: DraftItem = {
        id: `draft-${Date.now()}-${content.id}`,
        content,
        duration: content.duration ?? 5,
        sequence: items.length + 1,
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
            ? { ...item, duration: Math.max(1, duration) }
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
      const matchesSearch = content.title
        .toLowerCase()
        .includes(contentSearch.toLowerCase());
      return matchesSearch && !addedIds.has(content.id);
    });
  }, [availableContent, items, contentSearch]);

  return (
    <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        <div className="flex flex-col gap-4 rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <IconInfoCircle className="size-4" />
            <span className="text-sm font-semibold">Playlist Information</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playlist-name">Name</Label>
              <Input
                id="playlist-name"
                placeholder="Demo Playlist"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="playlist-description">
                Description (Optional)
              </Label>
              <Textarea
                id="playlist-description"
                placeholder="Enter playlist description"
                rows={3}
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconPlaylist className="size-4" />
              <span className="text-sm font-semibold">Playlist Items</span>
            </div>
            {itemsHeaderSlot}
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
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
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    {emptyItemsMessage}
                  </div>
                ) : (
                  items.map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      onRemove={handleRemoveItem}
                      onUpdateDuration={handleUpdateDuration}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-col gap-4 overflow-hidden rounded-md border border-border p-4 xl:w-80">
        <div className="flex items-center gap-2">
          <IconPhoto className="size-4" />
          <span className="text-sm font-semibold">Content Library</span>
        </div>

        <SearchControl
          value={contentSearch}
          onChange={setContentSearch}
          placeholder="Search contents..."
          ariaLabel="Search content library"
          className="max-w-none"
        />

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {filteredContent.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No content available
            </div>
          ) : (
            filteredContent.map((content) => (
              <button
                key={content.id}
                type="button"
                onClick={() => handleAddContent(content)}
                disabled={isOverDurationLimit}
                className={`focus-visible:ring-ring flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 ${isOverDurationLimit ? "cursor-not-allowed opacity-50" : ""}`}
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
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <IconPhoto
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <span className="flex-1 truncate text-sm">{content.title}</span>
                <IconPlus className="size-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
