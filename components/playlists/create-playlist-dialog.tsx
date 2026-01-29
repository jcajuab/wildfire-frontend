"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  pointerWithin,
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
  IconSearch,
  IconClock,
  IconEye,
  IconX,
} from "@tabler/icons-react";

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
import { Textarea } from "@/components/ui/textarea";
import type { Content } from "@/types/content";
import type { Playlist, PlaylistItem } from "@/types/playlist";

interface CreatePlaylistDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreate: (
    playlist: Omit<
      Playlist,
      "id" | "createdAt" | "updatedAt" | "createdBy" | "status"
    >,
  ) => void;
  readonly availableContent: readonly Content[];
}

interface PlaylistFormData {
  name: string;
  description: string;
}

interface DraftPlaylistItem {
  readonly id: string;
  readonly content: Content;
  readonly duration: number;
  readonly order: number;
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
}: SortablePlaylistItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { content: item.content } });

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
            value={item.duration}
            onChange={(e) =>
              onUpdateDuration(item.id, parseInt(e.target.value, 10) || 1)
            }
            className="w-12 rounded border bg-transparent px-1 text-center"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag when interacting with input
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
      >
        <IconX className="size-4" />
      </Button>
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        <IconGripVertical className="size-4" />
      </div>
    </div>
  );
}

interface LibraryItemCardProps {
  readonly content: Content;
  readonly onClick?: () => void;
  readonly className?: string;
}

function LibraryItemCard({
  content,
  onClick,
  className,
}: LibraryItemCardProps): React.ReactElement {
  return (
    <div
      className={`flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50 ${className}`}
    >
      <div className="flex size-10 items-center justify-center rounded bg-muted">
        {/* Placeholder for thumbnail */}
      </div>
      <span className="flex-1 truncate text-sm">{content.title}</span>
      <button
        type="button"
        onClick={onClick}
        className="flex size-6 items-center justify-center rounded hover:bg-muted"
      >
        <IconPlus className="size-4 text-muted-foreground" />
      </button>
      <IconGripVertical className="size-4 cursor-grab text-muted-foreground" />
    </div>
  );
}

function DraggableLibraryItem({
  content,
  onClick,
}: LibraryItemCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${content.id}`,
    data: { content },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-50" : ""}
    >
      <LibraryItemCard content={content} onClick={onClick} />
    </div>
  );
}

import { IconPlus } from "@tabler/icons-react";

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  onCreate,
  availableContent,
}: CreatePlaylistDialogProps): React.ReactElement {
  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    description: "",
  });
  const [playlistItems, setPlaylistItems] = useState<DraftPlaylistItem[]>([]);
  const [contentSearch, setContentSearch] = useState("");
  const [activeContent, setActiveContent] = useState<Content | null>(null);

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

  const { setNodeRef: setPlaylistDroppableRef } = useDroppable({
    id: "playlist-container",
  });

  const { setNodeRef: setLibraryDroppableRef } = useDroppable({
    id: "library-container",
  });

  const handleAddContent = useCallback((content: Content) => {
    const newItem: DraftPlaylistItem = {
      id: `draft-${Date.now()}-${content.id}`,
      content,
      duration: content.duration ?? 5, // Default 5 seconds for images/PDFs
      order: 0, // Will be recalculated
    };
    setPlaylistItems((prev) => [...prev, newItem]);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.content) {
      setActiveContent(event.active.data.current.content as Content);
    }
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setPlaylistItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveContent(null);

      if (!over) return;

      const activeId = active.id.toString();
      const overId = over.id.toString();

      // Handle Drop from Library -> Playlist
      if (activeId.startsWith("library-")) {
        const content = active.data.current?.content as Content;
        const isOverPlaylist =
          overId === "playlist-container" || overId.startsWith("draft-");

        if (isOverPlaylist && content) {
          handleAddContent(content);
        }
        return;
      }

      // Handle Drop from Playlist -> Library (Remove)
      if (activeId.startsWith("draft-")) {
        const isOverLibrary =
          overId === "library-container" || overId.startsWith("library-");

        if (isOverLibrary) {
          handleRemoveItem(activeId);
          return;
        }
      }

      // Handle Reorder
      if (
        active.id !== over.id &&
        activeId.startsWith("draft-") &&
        overId.startsWith("draft-")
      ) {
        setPlaylistItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);

          return arrayMove(items, oldIndex, newIndex);
        });
      }
    },
    [handleAddContent, handleRemoveItem],
  );

  // Filter available content - exclude already added items
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

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return playlistItems.reduce((sum, item) => sum + item.duration, 0);
  }, [playlistItems]);

  const handleClose = useCallback(() => {
    setFormData({ name: "", description: "" });
    setPlaylistItems([]);
    setContentSearch("");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCreate = useCallback(() => {
    if (!formData.name.trim()) return;

    const items: PlaylistItem[] = playlistItems.map((item, index) => ({
      id: item.id,
      content: item.content,
      duration: item.duration,
      order: index,
    }));

    onCreate({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      items,
      totalDuration,
    });

    handleClose();
  }, [formData, playlistItems, totalDuration, onCreate, handleClose]);

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

  const canCreate = formData.name.trim().length > 0;

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
              Create New Playlist
            </DialogTitle>
            <DialogDescription>
              Add and organize contents to form a playlist
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canCreate}>
              Create
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 gap-6 overflow-hidden p-6">
            {/* Left Column - Playlist Info & Items */}
            <div className="flex flex-1 flex-col gap-4 overflow-hidden">
              {/* Playlist Information Card */}
              <div className="flex flex-col gap-4 rounded-lg border p-4">
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

                  <p className="text-sm text-muted-foreground">
                    Total Duration: {formatDuration(totalDuration)}
                  </p>
                </div>
              </div>

              {/* Playlist Items Card */}
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconPlaylist className="size-4" />
                    <span className="text-sm font-semibold">
                      Playlist Items
                    </span>
                  </div>
                  <Button variant="outline" size="sm">
                    <IconEye className="size-4" />
                    Preview
                  </Button>
                </div>

                {/* Items List */}
                <div
                  ref={setPlaylistDroppableRef}
                  className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-md border-2 border-transparent transition-colors data-[over=true]:border-primary/20"
                >
                  <SortableContext
                    items={playlistItems}
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
                </div>
              </div>
            </div>

            {/* Right Column - Content Library */}
            <div
              ref={setLibraryDroppableRef}
              className="flex w-80 flex-col gap-4 overflow-hidden rounded-lg border p-4"
            >
              <div className="flex items-center gap-2">
                <IconPhoto className="size-4" />
                <span className="text-sm font-semibold">Content Library</span>
              </div>

              {/* Search */}
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search contents..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {/* Content List */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {filteredContent.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    No content available
                  </div>
                ) : (
                  filteredContent.map((content) => (
                    <DraggableLibraryItem
                      key={content.id}
                      content={content}
                      onClick={() => handleAddContent(content)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeContent ? (
              <div className="w-80 opacity-90">
                <LibraryItemCard
                  content={activeContent}
                  className="cursor-grabbing border-primary bg-background shadow-xl"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </DialogContent>
    </Dialog>
  );
}
