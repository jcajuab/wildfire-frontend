"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useMemo } from "react";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconClock,
  IconGripVertical,
  IconPhoto,
  IconPlaylist,
  IconPlus,
  IconX,
} from "@tabler/icons-react";

import { SearchControl } from "@/components/common/search-control";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Content } from "@/types/content";
import type { Playlist, PlaylistItem } from "@/types/playlist";

/** Local mutable copy of a playlist item used during editing. */
interface DraftItem {
  /** Original backend item ID, or a `draft-*` prefix for newly added items. */
  readonly id: string;
  readonly content: Content;
  duration: number;
  order: number;
}

interface SortableItemRowProps {
  readonly item: DraftItem;
  readonly onRemove: (id: string) => void;
  readonly onUpdateDuration: (id: string, duration: number) => void;
}

function SortableItemRow({
  item,
  onRemove,
  onUpdateDuration,
}: SortableItemRowProps): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
    >
      <div className="flex size-12 items-center justify-center rounded bg-muted" />

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{item.content.title}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconClock className="size-3" />
          <input
            type="number"
            min="1"
            value={item.duration}
            onChange={(e) =>
              onUpdateDuration(item.id, parseInt(e.target.value, 10) || 1)
            }
            className="w-12 rounded border bg-transparent px-1 text-center"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <span>sec</span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.content.title} from playlist`}
      >
        <IconX className="size-4" />
      </Button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.content.title}`}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        <IconGripVertical className="size-4" />
      </button>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} sec`;
}

export interface PlaylistItemsDiff {
  readonly added: readonly {
    readonly contentId: string;
    readonly sequence: number;
    readonly duration: number;
  }[];
  readonly updated: readonly {
    readonly itemId: string;
    readonly sequence: number;
    readonly duration: number;
  }[];
  readonly deleted: readonly string[];
}

interface EditPlaylistItemsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly playlist: Playlist;
  readonly availableContent: readonly Content[];
  readonly onSave: (playlistId: string, diff: PlaylistItemsDiff) => void;
  readonly isSaving?: boolean;
}

/** Converts loaded PlaylistItem[] into local DraftItem[]. */
function toDrafts(items: readonly PlaylistItem[]): DraftItem[] {
  return items.map((item, index) => ({
    id: item.id,
    content: item.content,
    duration: item.duration,
    order: index,
  }));
}

export function EditPlaylistItemsDialog({
  open,
  onOpenChange,
  playlist,
  availableContent,
  onSave,
  isSaving = false,
}: EditPlaylistItemsDialogProps): ReactElement {
  const [drafts, setDrafts] = useState<DraftItem[]>(() =>
    toDrafts(playlist.items),
  );
  const [contentSearch, setContentSearch] = useState("");

  // Reset local state when dialog opens with a different playlist.
  const [lastPlaylistId, setLastPlaylistId] = useState(playlist.id);
  if (playlist.id !== lastPlaylistId) {
    setLastPlaylistId(playlist.id);
    setDrafts(toDrafts(playlist.items));
    setContentSearch("");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAddContent = useCallback((content: Content) => {
    const newItem: DraftItem = {
      id: `draft-${Date.now()}-${content.id}`,
      content,
      duration: content.duration ?? 5,
      order: 0,
    };
    setDrafts((prev) => [...prev, newItem]);
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== itemId));
  }, []);

  const handleUpdateDuration = useCallback(
    (itemId: string, duration: number) => {
      setDrafts((prev) =>
        prev.map((d) =>
          d.id === itemId ? { ...d, duration: Math.max(1, duration) } : d,
        ),
      );
    },
    [],
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDrafts((items) => {
        const oldIndex = items.findIndex((d) => d.id === active.id);
        const newIndex = items.findIndex((d) => d.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const filteredContent = useMemo(() => {
    const addedIds = new Set(drafts.map((d) => d.content.id));
    return availableContent.filter((content) => {
      const matchesSearch = content.title
        .toLowerCase()
        .includes(contentSearch.toLowerCase());
      const notAdded = !addedIds.has(content.id);
      return matchesSearch && notAdded;
    });
  }, [availableContent, drafts, contentSearch]);

  const totalDuration = useMemo(
    () => drafts.reduce((sum, d) => sum + d.duration, 0),
    [drafts],
  );

  const handleSave = useCallback(() => {
    const originalIds = new Set(playlist.items.map((i) => i.id));
    const originalById = new Map(playlist.items.map((i) => [i.id, i]));

    const deleted = playlist.items
      .filter((orig) => !drafts.some((d) => d.id === orig.id))
      .map((orig) => orig.id);

    const added = drafts
      .filter((d) => d.id.startsWith("draft-"))
      .map((d, _i, arr) => ({
        contentId: d.content.id,
        sequence: drafts.indexOf(d) + 1,
        duration: d.duration,
        // recalculate below
      }));

    const updated = drafts
      .filter((d) => {
        if (!originalIds.has(d.id)) return false;
        const orig = originalById.get(d.id);
        if (!orig) return false;
        const newSeq = drafts.indexOf(d) + 1;
        return orig.duration !== d.duration || orig.order !== newSeq - 1;
      })
      .map((d) => ({
        itemId: d.id,
        sequence: drafts.indexOf(d) + 1,
        duration: d.duration,
      }));

    // Recompute added sequences using indexOf position in final drafts array.
    const addedFinal = drafts
      .filter((d) => d.id.startsWith("draft-"))
      .map((d) => ({
        contentId: d.content.id,
        sequence: drafts.indexOf(d) + 1,
        duration: d.duration,
      }));

    onSave(playlist.id, { added: addedFinal, updated, deleted });
  }, [drafts, playlist, onSave]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!flex h-[90vh] max-h-[800px] w-[95vw] !max-w-5xl !flex-col !gap-0 !p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="!flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-base font-semibold">
              Manage Playlist Items
            </DialogTitle>
            <DialogDescription>
              Reorder, update duration, add or remove items in &ldquo;
              {playlist.name}&rdquo;
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          {/* Left — Current items */}
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPlaylist className="size-4" />
                  <span className="text-sm font-semibold">Playlist Items</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {drafts.length} items &middot;{" "}
                  {formatDuration(totalDuration)}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={drafts}
                    strategy={verticalListSortingStrategy}
                  >
                    {drafts.length === 0 ? (
                      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                        No items — add content from the library
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

          {/* Right — Content library */}
          <div className="flex w-80 flex-col gap-4 overflow-hidden rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <IconPhoto className="size-4" />
              <span className="text-sm font-semibold">Content Library</span>
            </div>

            <SearchControl
              value={contentSearch}
              onChange={setContentSearch}
              placeholder="Search contents…"
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
                    className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex size-10 items-center justify-center rounded bg-muted" />
                    <span className="flex-1 truncate text-sm">
                      {content.title}
                    </span>
                    <IconPlus className="size-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
