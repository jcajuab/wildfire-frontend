"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
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
  IconEye,
  IconInfoCircle,
  IconPhoto,
  IconPlaylist,
  IconPlus,
} from "@tabler/icons-react";
import { SortablePlaylistItem } from "./sortable-playlist-item";
import { SearchControl } from "@/components/common/search-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Content } from "@/types/content";
import type { PlaylistItem } from "@/types/playlist";

export type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItem["content"]["type"];
};

export interface CreatePlaylistDraft {
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number;
}

export interface CreatePlaylistFormProps {
  readonly onCreate: (
    playlist: CreatePlaylistDraft,
  ) => Promise<boolean | void> | boolean | void;
  readonly onCancel?: () => void;
  readonly onSuccess?: () => void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly title?: string;
  readonly description?: string;
  readonly showHeader?: boolean;
  readonly surface?: "card" | "page";
}

interface PlaylistFormData {
  name: string;
  description: string;
}

interface DraftPlaylistItem {
  readonly id: string;
  readonly content: PlaylistSelectableContent;
  readonly duration: number;
  readonly order: number;
}

export const MAX_BASE_DURATION_SECONDS = 60;

function createInitialFormData(): PlaylistFormData {
  return {
    name: "",
    description: "",
  };
}

export function CreatePlaylistForm({
  onCreate,
  onCancel,
  onSuccess,
  availableContent,
  title = "Create New Playlist",
  description = "Add and organize contents to form a playlist",
  showHeader = true,
  surface = "card",
}: CreatePlaylistFormProps): ReactElement {
  const [formData, setFormData] = useState<PlaylistFormData>(
    createInitialFormData,
  );
  const [playlistItems, setPlaylistItems] = useState<DraftPlaylistItem[]>([]);
  const [contentSearch, setContentSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddContent = useCallback((content: PlaylistSelectableContent) => {
    const newItem: DraftPlaylistItem = {
      id: `draft-${Date.now()}-${content.id}`,
      content,
      duration: content.duration ?? 5,
      order: 0,
    };

    setPlaylistItems((prev) => [...prev, newItem]);
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setPlaylistItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleUpdateDuration = useCallback(
    (itemId: string, duration: number) => {
      setPlaylistItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, duration: Math.max(1, duration) } : item,
        ),
      );
    },
    [],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPlaylistItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const filteredContent = useMemo(() => {
    const addedIds = new Set(playlistItems.map((item) => item.content.id));

    return availableContent.filter((content) => {
      const matchesSearch = content.title
        .toLowerCase()
        .includes(contentSearch.toLowerCase());
      const notAdded = !addedIds.has(content.id);

      return matchesSearch && notAdded;
    });
  }, [availableContent, playlistItems, contentSearch]);

  const totalDuration = useMemo(() => {
    return playlistItems.reduce((sum, item) => sum + item.duration, 0);
  }, [playlistItems]);

  const isOverDurationLimit = totalDuration > MAX_BASE_DURATION_SECONDS;

  const resetDraftState = useCallback(() => {
    setFormData(createInitialFormData());
    setPlaylistItems([]);
    setContentSearch("");
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    resetDraftState();
    onCancel?.();
  }, [isSubmitting, onCancel, resetDraftState]);

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) {
      return;
    }

    const items: PlaylistItem[] = playlistItems.map((item, index) => ({
      id: item.id,
      content: item.content,
      duration: item.duration,
      order: index,
    }));

    setIsSubmitting(true);

    try {
      const didCreate = await onCreate({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        items,
        totalDuration,
      });

      if (didCreate === false) {
        return;
      }

      resetDraftState();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onCreate, onSuccess, playlistItems, resetDraftState, totalDuration]);

  const canCreate = formData.name.trim().length > 0 && !isOverDurationLimit;
  const isPageSurface = surface === "page";

  return (
    <div
      data-testid="create-playlist-form-root"
      className={
        isPageSurface
          ? "flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6 sm:px-8 sm:py-8"
          : "flex min-h-0 flex-1 flex-col gap-6 overflow-hidden rounded-md border border-border bg-background p-6"
      }
    >
      {showHeader ? (
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleCreate();
              }}
              disabled={!canCreate || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      ) : null}

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
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="playlist-description">Description (Optional)</Label>
                <Textarea
                  id="playlist-description"
                  placeholder="Enter playlist description"
                  rows={3}
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <p
                className={`text-sm ${isOverDurationLimit ? "text-destructive" : "text-muted-foreground"}`}
              >
                Base Duration: {totalDuration}s / {MAX_BASE_DURATION_SECONDS}s max
                {isOverDurationLimit ? " - over limit" : ""}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <IconPlaylist className="size-4" />
                <span className="text-sm font-semibold">Playlist Items</span>
              </div>
              <Button variant="outline" size="sm">
                <IconEye className="size-4" />
                Preview
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={playlistItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {playlistItems.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                      Add content from the library to get started
                    </div>
                  ) : (
                    playlistItems.map((item) => (
                      <SortablePlaylistItem
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
                  <div className="flex size-10 items-center justify-center rounded bg-muted" />
                  <span className="flex-1 truncate text-sm">{content.title}</span>
                  <IconPlus className="size-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {!showHeader ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              void handleCreate();
            }}
            disabled={!canCreate || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
