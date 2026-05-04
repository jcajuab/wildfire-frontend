"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconClock,
  IconGripVertical,
  IconPhoto,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getTextThumbnailHtml } from "@/lib/content-thumbnail-preview";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";
import { cn } from "@/lib/utils";
import type { Content } from "@/types/content";
import type { PlaylistItemContent } from "@/types/playlist";

type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItemContent["type"];
};

export interface DraftItem {
  readonly id: string;
  readonly content: PlaylistSelectableContent | PlaylistItemContent;
  duration: number;
  sequence: number;
  loop: boolean;
}

export interface SortableItemRowProps {
  readonly item: DraftItem;
  readonly onRemove: (id: string) => void;
  readonly onUpdateDuration: (id: string, duration: number) => void;
  readonly onUpdateLoop: (id: string, loop: boolean) => void;
}

export function SortableItemRow({
  item,
  onRemove,
  onUpdateDuration,
  onUpdateLoop,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valid sync pattern for controlled input
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
      className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-3 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div
          data-testid="playlist-item-thumbnail"
          className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted"
        >
          {item.content.thumbnailUrl ? (
            <Image
              src={item.content.thumbnailUrl}
              alt={`${item.content.title} thumbnail`}
              fill
              className="object-cover"
            />
          ) : item.content.type === "TEXT" && item.content.textHtmlContent ? (
            <div className="flex size-full items-start overflow-hidden p-1">
              <div
                className={cn(
                  RICH_TEXT_PREVIEW_CLASSES,
                  "text-[6px] leading-tight [&_ol]:ml-2 [&_td]:px-0.5 [&_th]:px-0.5 [&_ul]:ml-2",
                )}
                dangerouslySetInnerHTML={{
                  __html: getTextThumbnailHtml(item.content),
                }}
              />
            </div>
          ) : (
            <IconPhoto
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">
            {item.content.title}
          </span>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
            <div className="flex items-center gap-1">
              <IconClock className="size-4 shrink-0" />
              <Input
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
                className="h-8 w-24 px-2 text-center sm:w-16"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <span>sec</span>
            </div>
            {item.content.type === "VIDEO" ? (
              <div className="flex items-center gap-2">
                <Switch
                  id={`loop-${item.id}`}
                  checked={item.loop}
                  onCheckedChange={(checked) => onUpdateLoop(item.id, checked)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
                <Label
                  htmlFor={`loop-${item.id}`}
                  className="cursor-pointer font-normal text-muted-foreground"
                >
                  Loop video
                </Label>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1">
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
    </div>
  );
}
