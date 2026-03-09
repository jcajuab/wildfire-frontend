"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Display } from "@/lib/api/displays-api";
import { useEstimatePlaylistDurationMutation } from "@/lib/api/playlists-api";
import type { Content } from "@/types/content";
import type {
  Playlist,
  PlaylistItem,
  PlaylistItemContent,
} from "@/types/playlist";

type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItemContent["type"];
};

/** Local mutable copy of a playlist item used during editing. */
interface DraftItem {
  /** Original backend item ID, or a `draft-*` prefix for newly added items. */
  readonly id: string;
  readonly content: PlaylistSelectableContent | PlaylistItemContent;
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

  const [rawValue, setRawValue] = useState(String(item.duration));

  useEffect(() => {
    setRawValue(String(item.duration));
  }, [item.duration]);

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
      className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3"
    >
      <div className="flex size-12 items-center justify-center rounded bg-muted" />

      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{item.content.title}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconClock className="size-4" />
          <input
            type="number"
            min="1"
            value={rawValue}
            aria-label={`Duration in seconds for ${item.content.title}`}
            onChange={(e) => {
              setRawValue(e.target.value);
              const parsed = parseInt(e.target.value, 10);
              if (Number.isFinite(parsed) && parsed > 0) {
                onUpdateDuration(item.id, parsed);
              }
            }}
            onBlur={() => {
              const parsed = parseInt(rawValue, 10);
              const clamped = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
              setRawValue(String(clamped));
              onUpdateDuration(item.id, clamped);
            }}
            className="focus-visible:ring-ring w-12 rounded border border-border bg-transparent px-1 text-center focus-visible:outline-none focus-visible:ring-2"
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
        className="focus-visible:ring-ring cursor-grab rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 active:cursor-grabbing"
      >
        <IconGripVertical className="size-4" />
      </button>
    </div>
  );
}

const MAX_BASE_DURATION_SECONDS = 60;

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} sec`;
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

interface EditPlaylistItemsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly playlist: Playlist;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly availableDisplays: readonly Display[];
  readonly onSave: (
    playlistId: string,
    items: PlaylistItemsAtomicSnapshot,
  ) => void;
  readonly isSaving?: boolean;
}

/** Converts loaded PlaylistItem[] into local DraftItem[]. */
function toDrafts(items: readonly PlaylistItem[]): DraftItem[] {
  return items.map((item) => ({
    id: item.id,
    content: item.content,
    duration: item.duration,
    order: item.order,
  }));
}

export function EditPlaylistItemsDialog({
  open,
  onOpenChange,
  playlist,
  availableContent,
  availableDisplays,
  onSave,
  isSaving = false,
}: EditPlaylistItemsDialogProps): ReactElement {
  const [drafts, setDrafts] = useState<DraftItem[]>(() =>
    toDrafts(playlist.items),
  );
  const [contentSearch, setContentSearch] = useState("");
  const [selectedDisplayId, setSelectedDisplayId] = useState("");
  const [estimate, setEstimate] = useState<{
    baseDurationSeconds: number;
    scrollExtraSeconds: number;
    effectiveDurationSeconds: number;
  } | null>(null);
  const [estimatePlaylistDuration, { isLoading: isEstimatingDuration }] =
    useEstimatePlaylistDurationMutation();

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

  const isOverDurationLimit = totalDuration > MAX_BASE_DURATION_SECONDS;

  const selectableDisplays = useMemo(
    () =>
      availableDisplays.filter(
        (display) =>
          typeof display.screenWidth === "number" &&
          display.screenWidth > 0 &&
          typeof display.screenHeight === "number" &&
          display.screenHeight > 0,
      ),
    [availableDisplays],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (selectedDisplayId.length === 0) {
      return;
    }
    if (drafts.length === 0) {
      return;
    }

    let disposed = false;
    void estimatePlaylistDuration({
      displayId: selectedDisplayId,
      items: drafts.map((draft, index) => ({
        contentId: draft.content.id,
        duration: draft.duration,
        sequence: index + 1,
      })),
    })
      .unwrap()
      .then((result) => {
        if (!disposed) {
          setEstimate({
            baseDurationSeconds: result.baseDurationSeconds,
            scrollExtraSeconds: result.scrollExtraSeconds,
            effectiveDurationSeconds: result.effectiveDurationSeconds,
          });
        }
      })
      .catch(() => {
        if (!disposed) {
          setEstimate(null);
        }
      });

    return () => {
      disposed = true;
    };
  }, [drafts, estimatePlaylistDuration, open, selectedDisplayId]);

  const resolvedEstimate = useMemo(() => {
    if (selectedDisplayId.length === 0) {
      return null;
    }
    if (drafts.length === 0) {
      return {
        baseDurationSeconds: 0,
        scrollExtraSeconds: 0,
        effectiveDurationSeconds: 0,
      };
    }
    return estimate;
  }, [drafts.length, estimate, selectedDisplayId]);

  const handleSave = useCallback(() => {
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
    onSave(playlist.id, snapshot);
  }, [drafts, onSave, playlist.id]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex! h-[90vh] max-h-[800px] w-[95vw] max-w-5xl! flex-col! gap-0! p-0!"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="flex-row! items-center justify-between border-b border-border px-6 py-4">
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
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedDisplayId.length === 0 || isOverDurationLimit}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          {/* Left — Current items */}
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPlaylist className="size-4" />
                  <span className="text-sm font-semibold">Playlist Items</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {drafts.length} items &middot;{" "}
                  {formatDuration(
                    resolvedEstimate?.effectiveDurationSeconds ?? totalDuration,
                  )}
                  {isEstimatingDuration ? " (calculating…)" : ""}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Display target
                  </span>
                  <Select
                    value={selectedDisplayId}
                    onValueChange={setSelectedDisplayId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a display" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectableDisplays.map((display) => (
                        <SelectItem key={display.id} value={display.id}>
                          {display.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">
                    Base duration
                  </span>
                  <div
                    className={`rounded-md border px-2.5 py-2 text-sm ${
                      isOverDurationLimit
                        ? "border-destructive text-destructive"
                        : "border-border"
                    }`}
                  >
                    {totalDuration}s / {MAX_BASE_DURATION_SECONDS}s max
                    {isOverDurationLimit ? " — over limit" : ""}
                  </div>
                </div>
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
          <div className="flex w-80 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
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
                    disabled={isOverDurationLimit}
                    className="focus-visible:ring-ring flex items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
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
