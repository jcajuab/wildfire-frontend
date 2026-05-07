"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Content } from "@/types/content";
import type { PlaylistItem } from "@/types/playlist";
import { type DraftItem } from "./sortable-item-row";
import { PlaylistFormBody } from "./playlist-form-body";

export type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItem["content"]["type"];
};

export interface CreatePlaylistDraft {
  readonly name: string;
  readonly description: string | null;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number;
}

export interface CreatePlaylistFormActionState {
  readonly canCreate: boolean;
  readonly isSubmitting: boolean;
  readonly handleCancel: () => void;
  readonly handleCreate: () => void;
}

export interface CreatePlaylistFormProps {
  readonly onCreate: (
    playlist: CreatePlaylistDraft,
  ) => Promise<boolean | void> | boolean | void;
  readonly onCancel?: () => void;
  readonly onSuccess?: () => void;
  readonly onStateChange?: (state: CreatePlaylistFormActionState) => void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly title?: string;
  readonly description?: string;
  readonly showHeader?: boolean;
  readonly surface?: "card" | "page";
}

export const MAX_BASE_DURATION_SECONDS = 60;

export function CreatePlaylistForm({
  onCreate,
  onCancel,
  onSuccess,
  onStateChange,
  availableContent,
  title = "Create New Playlist",
  description = "Add and organize contents to form a playlist",
  showHeader = true,
  surface = "card",
}: CreatePlaylistFormProps): ReactElement {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDuration = useMemo(
    () => items.reduce((sum, item) => sum + item.duration, 0),
    [items],
  );

  const isOverDurationLimit = totalDuration > MAX_BASE_DURATION_SECONDS;
  const canCreate = name.trim().length > 0 && !isOverDurationLimit;

  const resetDraftState = useCallback(() => {
    setName("");
    setDesc("");
    setItems([]);
    setIsSubmitting(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    resetDraftState();
    onCancel?.();
  }, [isSubmitting, onCancel, resetDraftState]);

  const handleCreate = useCallback(async () => {
    if (!canCreate || isSubmitting) return;

    const playlistItems: PlaylistItem[] = items.map((item, index) => ({
      id: item.id,
      content: item.content,
      duration: item.duration,
      sequence: index,
      loop: item.loop,
    }));

    setIsSubmitting(true);
    try {
      const didCreate = await onCreate({
        name: name.trim(),
        description: desc.trim() || null,
        items: playlistItems,
        totalDuration,
      });

      if (didCreate === false) return;

      resetDraftState();
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canCreate,
    desc,
    isSubmitting,
    onCreate,
    onSuccess,
    items,
    name,
    resetDraftState,
    totalDuration,
  ]);

  useEffect(() => {
    onStateChange?.({
      canCreate,
      isSubmitting,
      handleCancel,
      handleCreate,
    });
  }, [canCreate, handleCancel, handleCreate, isSubmitting, onStateChange]);

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

      <PlaylistFormBody
        name={name}
        onNameChange={setName}
        description={desc}
        onDescriptionChange={setDesc}
        items={items}
        onItemsChange={setItems}
        availableContent={availableContent}
        isOverDurationLimit={isOverDurationLimit}
        itemsHeaderSlot={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setItems([])}
              disabled={isSubmitting}
              className={items.length === 0 ? "invisible" : ""}
            >
              Remove All
            </Button>
            <span
              className={`text-sm ${isOverDurationLimit ? "text-red-500" : "text-muted-foreground"}`}
            >
              {totalDuration}s / 60s
            </span>
          </div>
        }
        itemsSubtitleSlot={
          <p className="text-xs text-muted-foreground">
            The max playlist duration should not exceed more than{" "}
            {MAX_BASE_DURATION_SECONDS} seconds or 1 minute.
          </p>
        }
        emptyItemsMessage="Add content from the library to get started"
        disabled={isSubmitting}
      />
    </div>
  );
}
