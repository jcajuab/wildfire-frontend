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
  readonly onStateChange?: (state: {
    canCreate: boolean;
    isSubmitting: boolean;
    handleCancel: () => void;
    handleCreate: () => Promise<void>;
  }) => void;
}

export const MAX_BASE_DURATION_SECONDS = 60;

export function CreatePlaylistForm({
  onCreate,
  onCancel,
  onSuccess,
  availableContent,
  title = "Create New Playlist",
  description = "Add and organize contents to form a playlist",
  showHeader = true,
  surface = "card",
  onStateChange,
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
    if (!name.trim() || isSubmitting || isOverDurationLimit) return;

    const playlistItems: PlaylistItem[] = items.map((item, index) => ({
      id: item.id,
      content: item.content,
      duration: item.duration,
      sequence: index,
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
    name,
    desc,
    isOverDurationLimit,
    isSubmitting,
    onCreate,
    onSuccess,
    items,
    resetDraftState,
    totalDuration,
  ]);

  const canCreate = name.trim().length > 0 && !isOverDurationLimit;
  const isPageSurface = surface === "page";

  useEffect(() => {
    onStateChange?.({ canCreate, isSubmitting, handleCancel, handleCreate });
  }, [canCreate, handleCancel, handleCreate, isSubmitting, onStateChange]);

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
        emptyItemsMessage="Add content from the library to get started"
      />
    </div>
  );
}
