"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
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
  IconInfoCircle,
  IconPhoto,
  IconPlaylist,
  IconGripVertical,
  IconClock,
  IconEye,
  IconX,
  IconPlus,
} from "@tabler/icons-react";

import { SearchControl } from "@/components/common/search-control";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Display } from "@/lib/api/displays-api";
import { useEstimatePlaylistDurationMutation } from "@/lib/api/playlists-api";
import type { Content } from "@/types/content";
import type { PlaylistItem } from "@/types/playlist";

type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItem["content"]["type"];
};

interface NewPlaylistDraft {
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number;
}

interface CreatePlaylistDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreate: (
    playlist: NewPlaylistDraft,
  ) => Promise<boolean | void> | boolean | void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly availableDisplays: readonly Display[];
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

const MAX_BASE_DURATION_SECONDS = 60;

function createInitialFormData(): PlaylistFormData {
  return {
    name: "",
    description: "",
  };
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} sec`;
}

interface SortablePlaylistItemProps {
  readonly item: DraftPlaylistItem;
  readonly onRemove: (id: string) => void;
  readonly onUpdateDuration: (id: string, duration: number) => void;
}

function SortablePlaylistItem({
  item,
  onRemove,
  onUpdateDuration,
}: SortablePlaylistItemProps): ReactElement {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync controlled input with prop
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
      {/* Thumbnail */}
      <div className="flex size-12 items-center justify-center rounded bg-muted">
        {/* Placeholder for thumbnail */}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{item.content.title}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconClock className="size-3" />
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
              const clamped =
                Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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

      {/* Actions */}
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

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onCreate,
  availableContent,
  availableDisplays,
}: CreatePlaylistDialogProps): ReactElement {
  const [formData, setFormData] = useState<PlaylistFormData>(
    createInitialFormData,
  );
  const [playlistItems, setPlaylistItems] = useState<DraftPlaylistItem[]>([]);
  const [contentSearch, setContentSearch] = useState("");
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimate, setEstimate] = useState<{
    baseDurationSeconds: number;
    scrollExtraSeconds: number;
    effectiveDurationSeconds: number;
  } | null>(null);
  const [estimatePlaylistDuration, { isLoading: isEstimatingDuration }] =
    useEstimatePlaylistDurationMutation();

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
          item.id === itemId
            ? { ...item, duration: Math.max(1, duration) }
            : item,
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
    if (playlistItems.length === 0) {
      return;
    }

    let disposed = false;
    void estimatePlaylistDuration({
      displayId: selectedDisplayId,
      items: playlistItems.map((item, index) => ({
        contentId: item.content.id,
        duration: item.duration,
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
  }, [estimatePlaylistDuration, open, playlistItems, selectedDisplayId]);

  const resolvedEstimate = useMemo(() => {
    if (selectedDisplayId.length === 0) {
      return null;
    }
    if (playlistItems.length === 0) {
      return {
        baseDurationSeconds: 0,
        scrollExtraSeconds: 0,
        effectiveDurationSeconds: 0,
      };
    }
    return estimate;
  }, [estimate, playlistItems.length, selectedDisplayId]);

  const resetDraftState = useCallback(() => {
    setFormData(createInitialFormData());
    setPlaylistItems([]);
    setContentSearch("");
    setSelectedDisplayId("");
    setIsSubmitting(false);
    setEstimate(null);
  }, []);

  useEffect(() => {
    if (!open) {
      resetDraftState();
    }
  }, [open, resetDraftState]);

  const handleDismiss = useCallback(() => {
    if (isSubmitting) {
      return;
    }
    resetDraftState();
    onOpenChange(false);
  }, [isSubmitting, onOpenChange, resetDraftState]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }

      handleDismiss();
    },
    [handleDismiss, onOpenChange],
  );

  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) return;

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

      handleDismiss();
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, handleDismiss, onCreate, playlistItems, totalDuration]);

  const canCreate = formData.name.trim().length > 0 && !isOverDurationLimit;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="!flex h-[90vh] max-h-[800px] w-[95vw] !max-w-5xl !flex-col !gap-0 !p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="!flex-row items-center justify-between border-b border-border px-6 py-4">
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-base font-semibold">
              Create New Playlist
            </DialogTitle>
            <DialogDescription>
              Add and organize contents to form a playlist
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDismiss}
              aria-label="Close"
              disabled={isSubmitting}
            >
              <IconX className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
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
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-1 gap-6 overflow-hidden p-6">
          {/* Left Column - Playlist Info & Items */}
          <div className="flex flex-1 flex-col gap-4 overflow-hidden">
            {/* Playlist Information Card */}
            <div className="flex flex-col gap-4 rounded-md border border-border p-4">
              <div className="flex items-center gap-2">
                <IconInfoCircle className="size-4" />
                <span className="text-sm font-semibold">
                  Playlist Information
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="playlist-name">Name</Label>
                  <Input
                    id="playlist-name"
                    placeholder="Demo Playlist"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="playlist-display-target">
                    Display Target (Optional)
                  </Label>
                  <Select
                    value={selectedDisplayId}
                    onValueChange={setSelectedDisplayId}
                  >
                    <SelectTrigger id="playlist-display-target">
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

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="playlist-description">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="playlist-description"
                    placeholder="Enter playlist description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <p
                  className={`text-sm ${isOverDurationLimit ? "text-destructive" : "text-muted-foreground"}`}
                >
                  Base Duration: {totalDuration}s / {MAX_BASE_DURATION_SECONDS}s
                  max
                  {isOverDurationLimit ? " — over limit" : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  Effective Duration:{" "}
                  {formatDuration(
                    resolvedEstimate?.effectiveDurationSeconds ?? totalDuration,
                  )}
                  {isEstimatingDuration ? " (calculating…)" : ""}
                </p>
              </div>
            </div>

            {/* Playlist Items Card */}
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconPlaylist className="size-4" />
                  <span className="text-sm font-semibold">Playlist Items</span>
                </div>
                <Button variant="outline" size="sm">
                  <IconEye className="size-4" />
                  Preview
                </Button>
              </div>

              {/* Items List */}
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

          {/* Right Column - Content Library */}
          <div className="flex w-80 flex-col gap-4 overflow-hidden rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <IconPhoto className="size-4" />
              <span className="text-sm font-semibold">Content Library</span>
            </div>

            {/* Search */}
            <SearchControl
              value={contentSearch}
              onChange={setContentSearch}
              placeholder="Search contents…"
              ariaLabel="Search content library"
              className="max-w-none"
            />

            {/* Content List */}
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
                    <div className="flex size-10 items-center justify-center rounded bg-muted">
                      {/* Placeholder for thumbnail */}
                    </div>
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
