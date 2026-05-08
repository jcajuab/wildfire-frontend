"use client";

import type { ReactElement } from "react";
import { formatDuration } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  readonly showCounter?: boolean;
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
  readonly showCounter: boolean;
  readonly onShowCounterChange: (value: boolean) => void;
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
  showCounter,
  onShowCounterChange,
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex cursor-pointer items-center gap-1.5">
                  <Switch
                    id="edit-playlist-show-counter"
                    checked={showCounter}
                    onCheckedChange={onShowCounterChange}
                    disabled={isSaving}
                  />
                  <label
                    htmlFor="edit-playlist-show-counter"
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    Show counter
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Turning this on will show a counter for each content duration
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      }
      itemsSubtitleSlot={
        <p className="text-xs text-muted-foreground">
          The max playlist duration should not exceed more than{" "}
          {MAX_BASE_DURATION_SECONDS} seconds or 1 minute.
        </p>
      }
      emptyItemsMessage="No items - add content from the library"
      disabled={isSaving}
    />
  );
}
