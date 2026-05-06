"use client";

import type { ReactElement } from "react";
import { formatDuration } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import type { Content } from "@/types/content";
import type { PlaylistItem, PlaylistItemContent } from "@/types/playlist";
import { type DraftItem } from "./sortable-item-row";
import { PlaylistFormBody } from "./playlist-form-body";
import { MAX_BASE_DURATION_SECONDS } from "./create-playlist-form";

export type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItemContent["type"];
};

export function toDrafts(items: readonly PlaylistItem[]): DraftItem[] {
  return items.map((item) => ({
    id: item.id,
    content: item.content,
    duration: item.duration,
    sequence: item.sequence,
    loop: item.loop,
  }));
}

export type PlaylistItemsAtomicSnapshot = readonly (
  | { kind: "existing"; itemId: string; duration: number; loop: boolean }
  | { kind: "new"; contentId: string; duration: number; loop: boolean }
)[];

export interface PlaylistMetadataDraft {
  readonly name: string;
  readonly description: string | null;
}

export interface PlaylistEditorSavePayload {
  readonly metadata: PlaylistMetadataDraft;
  readonly items: PlaylistItemsAtomicSnapshot;
}

export interface EditPlaylistFormProps {
  readonly name: string;
  readonly onNameChange: (value: string) => void;
  readonly description: string;
  readonly onDescriptionChange: (value: string) => void;
  readonly items: DraftItem[];
  readonly onItemsChange: (items: DraftItem[]) => void;
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly isOverDurationLimit: boolean;
  readonly totalDuration: number;
  readonly isSaving: boolean;
}

export function EditPlaylistForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  items,
  onItemsChange,
  availableContent,
  isOverDurationLimit,
  totalDuration,
  isSaving,
}: EditPlaylistFormProps): ReactElement {
  return (
    <PlaylistFormBody
      name={name}
      onNameChange={onNameChange}
      description={description}
      onDescriptionChange={onDescriptionChange}
      items={items}
      onItemsChange={onItemsChange}
      availableContent={availableContent}
      isOverDurationLimit={isOverDurationLimit}
      itemsHeaderSlot={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onItemsChange([])}
            disabled={isSaving}
            className={items.length === 0 ? "invisible" : ""}
          >
            Remove All
          </Button>
          <span
            className={`text-sm ${isOverDurationLimit ? "text-red-500" : "text-muted-foreground"}`}
          >
            {items.length} items &middot; {formatDuration(totalDuration)}
          </span>
        </div>
      }
      itemsSubtitleSlot={
        <p className="text-xs text-muted-foreground">
          The max playlist duration should not exceed more than 60 seconds or
          1 minute.
        </p>
      }
      emptyItemsMessage="No items - add content from the library"
      disabled={isSaving}
    />
  );
}
