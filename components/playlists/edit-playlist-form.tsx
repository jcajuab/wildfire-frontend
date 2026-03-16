"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { SearchControl } from "@/components/common/search-control";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/formatters";
import type { Content } from "@/types/content";
import type {
  Playlist,
  PlaylistItem,
  PlaylistItemContent,
} from "@/types/playlist";
import { SortableItemRow, type DraftItem } from "./sortable-item-row";

export type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItemContent["type"];
};

function createInitialDraftState(playlist: Playlist): {
  name: string;
  description: string;
  drafts: DraftItem[];
  contentSearch: string;
} {
  return {
    name: playlist.name,
    description: playlist.description ?? "",
    drafts: toDrafts(playlist.items),
    contentSearch: "",
  };
}

export type PlaylistItemsAtomicSnapshot = readonly (
  | {
      kind: "existing";
      itemId: string;
      duration: number;
    }
  | {
      kind: "new";
      contentId: string;
      duration: number;
    }
)[];

export interface PlaylistMetadataDraft {
  readonly name: string;
  readonly description: string | null;
}

export interface PlaylistEditorSavePayload {
  readonly metadata: PlaylistMetadataDraft;
  readonly items: PlaylistItemsAtomicSnapshot;
}

export interface EditPlaylistFormState {
  readonly canSave: boolean;
  readonly isSaving: boolean;
  handleCancel: () => void;
  handleSave: () => void;
}

export interface EditPlaylistFormProps {
  readonly playlist: Playlist;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly onSave: (payload: PlaylistEditorSavePayload) => void;
  readonly onCancel?: () => void;
  readonly onStateChange?: (state: EditPlaylistFormState) => void;
  readonly isSaving?: boolean;
}

function toDrafts(items: readonly PlaylistItem[]): DraftItem[] {
  return items.map((item) => ({
    id: item.id,
    content: item.content,
    duration: item.duration,
    order: item.order,
  }));
}

export function EditPlaylistForm({
  playlist,
  availableContent,
  onSave,
  onCancel,
  onStateChange,
  isSaving = false,
}: EditPlaylistFormProps): ReactElement {
  const [playlistName, setPlaylistName] = useState(() => playlist.name);
  const [playlistDescription, setPlaylistDescription] = useState(
    () => playlist.description ?? "",
  );
  const [drafts, setDrafts] = useState<DraftItem[]>(() =>
    toDrafts(playlist.items),
  );
  const [contentSearch, setContentSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddContent = useCallback((content: PlaylistSelectableContent) => {
    const newItem: DraftItem = {
      id: `draft-${Date.now()}-${content.id}`,
      content,
      duration: content.duration ?? 5,
      order: 0,
    };
    setDrafts((prev) => [...prev, newItem]);
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== itemId));
  }, []);

  const handleUpdateDuration = useCallback(
    (itemId: string, duration: number) => {
      setDrafts((prev) =>
        prev.map((draft) =>
          draft.id === itemId
            ? { ...draft, duration: Math.max(1, duration) }
            : draft,
        ),
      );
    },
    [],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDrafts((items) => {
        const oldIndex = items.findIndex((draft) => draft.id === active.id);
        const newIndex = items.findIndex((draft) => draft.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const filteredContent = useMemo(() => {
    const addedIds = new Set(drafts.map((draft) => draft.content.id));
    return availableContent.filter((content) => {
      const matchesSearch = content.title
        .toLowerCase()
        .includes(contentSearch.toLowerCase());
      const notAdded = !addedIds.has(content.id);
      return matchesSearch && notAdded;
    });
  }, [availableContent, drafts, contentSearch]);

  const totalDuration = useMemo(
    () => drafts.reduce((sum, draft) => sum + draft.duration, 0),
    [drafts],
  );

  const resetDraftState = useCallback((nextPlaylist: Playlist) => {
    const nextState = createInitialDraftState(nextPlaylist);
    setPlaylistName(nextState.name);
    setPlaylistDescription(nextState.description);
    setDrafts(nextState.drafts);
    setContentSearch(nextState.contentSearch);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valid sync pattern for draft reset when the source playlist changes
    resetDraftState(playlist);
  }, [playlist, resetDraftState]);

  const handleSave = useCallback(() => {
    if (isSaving) {
      return;
    }

    const snapshot: PlaylistItemsAtomicSnapshot = drafts.map((draft) =>
      draft.id.startsWith("draft-")
        ? {
            kind: "new",
            contentId: draft.content.id,
            duration: draft.duration,
          }
        : {
            kind: "existing",
            itemId: draft.id,
            duration: draft.duration,
          },
    );

    onSave({
      metadata: {
        name: playlistName.trim(),
        description:
          playlistDescription.trim().length > 0
            ? playlistDescription.trim()
            : null,
      },
      items: snapshot,
    });
  }, [drafts, isSaving, onSave, playlistDescription, playlistName]);

  const handleCancel = useCallback(() => {
    if (isSaving) {
      return;
    }

    resetDraftState(playlist);
    onCancel?.();
  }, [isSaving, onCancel, playlist, resetDraftState]);

  useEffect(() => {
    onStateChange?.({
      canSave: !isSaving,
      isSaving,
      handleCancel,
      handleSave,
    });
  }, [handleCancel, handleSave, isSaving, onStateChange]);

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
                value={playlistName}
                onChange={(event) => setPlaylistName(event.target.value)}
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
                value={playlistDescription}
                onChange={(event) => setPlaylistDescription(event.target.value)}
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
            <span className="text-sm text-muted-foreground">
              {drafts.length} items &middot; {formatDuration(totalDuration)}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={drafts.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {drafts.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    No items - add content from the library
                  </div>
                ) : (
                  drafts.map((item) => (
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
                className="focus-visible:ring-ring flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2"
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
