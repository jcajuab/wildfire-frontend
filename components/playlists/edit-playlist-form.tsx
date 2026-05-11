"use client";

import type { ReactElement } from "react";
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
import {
  getPlaylistItemLoop,
  PlaylistDurationBudget,
  PlaylistFormBody,
} from "./playlist-form-body";
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
    loop: getPlaylistItemLoop(item.content),
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
  readonly contentSearch?: string;
  readonly onContentSearchChange?: (value: string) => void;
  readonly isContentLibraryLoading?: boolean;
  readonly isContentLibraryFetching?: boolean;
  readonly hasMoreContent?: boolean;
  readonly onLoadMoreContent?: () => void;
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
  contentSearch,
  onContentSearchChange,
  isContentLibraryLoading,
  isContentLibraryFetching,
  hasMoreContent,
  onLoadMoreContent,
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
      contentSearch={contentSearch}
      onContentSearchChange={onContentSearchChange}
      isContentLibraryLoading={isContentLibraryLoading}
      isContentLibraryFetching={isContentLibraryFetching}
      hasMoreContent={hasMoreContent}
      onLoadMoreContent={onLoadMoreContent}
      isOverDurationLimit={isOverDurationLimit}
      itemsHeaderSlot={
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
      }
      itemsStatusSlot={
        <PlaylistDurationBudget
          itemCount={items.length}
          totalDuration={totalDuration}
          durationLimit={MAX_BASE_DURATION_SECONDS}
        />
      }
      itemsSubtitleSlot={
        <p className="text-xs text-muted-foreground">
          Add content and set durations. Playlists cannot exceed 60 seconds.
        </p>
      }
      emptyItemsMessage="Add content from the library to build this playlist."
      disabled={isSaving}
    />
  );
}
