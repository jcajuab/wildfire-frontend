"use client";

import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { PlaylistFormBody } from "@/components/playlists/playlist-form-body";
import {
  MAX_BASE_DURATION_SECONDS,
  type CreatePlaylistDraft,
} from "@/components/playlists/create-playlist-form";
import { type DraftItem } from "@/components/playlists/sortable-item-row";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlaylistItem } from "@/types/playlist";
import { useCreatePlaylistPage } from "./use-create-playlist-page";

export function CreatePlaylistPageView(): ReactElement {
  const {
    availableContent,
    handleCancel: navigateToList,
    handleCreatePlaylist,
  } = useCreatePlaylistPage();

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showCounter, setShowCounter] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);
  const isOverDurationLimit = totalDuration > MAX_BASE_DURATION_SECONDS;
  const canCreate = name.trim().length > 0 && !isOverDurationLimit;

  const handleCreate = useCallback(async () => {
    if (!canCreate || isSubmitting) return;

    const playlistItems: PlaylistItem[] = items.map((item, index) => ({
      id: item.id,
      content: item.content,
      duration: item.duration,
      sequence: index,
      loop: item.loop,
    }));

    const draft: CreatePlaylistDraft = {
      name: name.trim(),
      description: desc.trim() || null,
      showCounter,
      items: playlistItems,
      totalDuration,
    };

    setIsSubmitting(true);
    try {
      const didCreate = await handleCreatePlaylist(draft);
      if (didCreate === false) return;
      setName("");
      setDesc("");
      setItems([]);
      setShowCounter(false);
      navigateToList();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canCreate,
    desc,
    handleCreatePlaylist,
    isSubmitting,
    items,
    name,
    navigateToList,
    showCounter,
    totalDuration,
  ]);

  const handleCancel = useCallback(() => {
    if (isSubmitting) return;
    setName("");
    setDesc("");
    setItems([]);
    setShowCounter(false);
    navigateToList();
  }, [isSubmitting, navigateToList]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="Create Playlist">
        <div className="flex flex-wrap items-center gap-2">
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
      </PageHeader>
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-6 py-6 sm:px-8 sm:py-8">
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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="flex cursor-pointer items-center gap-1.5">
                          <Switch
                            checked={showCounter}
                            onCheckedChange={setShowCounter}
                            disabled={isSubmitting}
                          />
                          <span className="text-xs text-muted-foreground">
                            Show counter
                          </span>
                        </label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Turning this on will show a counter for each content
                          duration
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              }
              itemsSubtitleSlot={
                <p className="text-xs text-muted-foreground">
                  The max playlist duration should not exceed more than 60
                  seconds or 1 minute.
                </p>
              }
              emptyItemsMessage="Add content from the library to get started"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
