"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconClock,
  IconGripVertical,
  IconMinus,
  IconPhoto,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTextThumbnailText } from "@/lib/content-thumbnail-preview";
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
  readonly disabled?: boolean;
}

const formatSecondsLabel = (seconds: number): string =>
  `${seconds} ${seconds === 1 ? "sec" : "sec"}`;

export function SortableItemRow({
  item,
  onRemove,
  onUpdateDuration,
  disabled = false,
}: SortableItemRowProps): ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled });

  const [rawValue, setRawValue] = useState(String(item.duration));
  const maxDuration =
    item.content.type === "VIDEO" &&
    item.content.duration != null &&
    item.content.duration > 0
      ? item.content.duration
      : undefined;
  const clampDuration = (value: number) =>
    Math.max(1, Math.min(value, maxDuration ?? Number.MAX_SAFE_INTEGER));
  const commitDuration = (duration: number) => {
    const clamped = clampDuration(duration);
    setRawValue(String(clamped));
    onUpdateDuration(item.id, clamped);
  };

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
      className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 transition-colors hover:bg-muted/30 lg:flex-row lg:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 lg:items-center">
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
          ) : item.content.type === "TEXT" &&
            (item.content.textPreviewText || item.content.textHtmlContent) ? (
            <div className="flex size-full items-start overflow-hidden p-1">
              <p className="line-clamp-4 text-[6px] leading-tight text-foreground">
                {getTextThumbnailText(item.content)}
              </p>
            </div>
          ) : (
            <IconPhoto
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="truncate text-sm font-medium">
            {item.content.title}
          </span>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <div className="flex h-8 items-center gap-0.5 rounded-md border border-input bg-background px-1 shadow-xs">
              <IconClock
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => commitDuration(item.duration - 1)}
                aria-label={`Decrease duration for ${item.content.title}`}
                disabled={disabled || item.duration <= 1}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <IconMinus className="size-3.5" aria-hidden="true" />
              </Button>
              <Input
                type="number"
                min="1"
                max={maxDuration}
                value={rawValue}
                aria-label={`Duration in seconds for ${item.content.title}`}
                disabled={disabled}
                onChange={(e) => {
                  setRawValue(e.target.value);
                  const parsed = parseInt(e.target.value, 10);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    onUpdateDuration(item.id, clampDuration(parsed));
                  }
                }}
                onBlur={() => {
                  const parsed = parseInt(rawValue, 10);
                  commitDuration(
                    Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                  );
                }}
                className="h-7 w-12 border-0 bg-transparent px-0 text-center font-medium text-primary tabular-nums shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <span className="-ml-0.5">sec</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => commitDuration(item.duration + 1)}
                aria-label={`Increase duration for ${item.content.title}`}
                disabled={
                  disabled ||
                  item.duration >= (maxDuration ?? Number.MAX_SAFE_INTEGER)
                }
                onPointerDown={(e) => e.stopPropagation()}
              >
                <IconPlus className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
            {maxDuration != null ? (
              <span>Max {formatSecondsLabel(maxDuration)}</span>
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
          disabled={disabled}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/20"
        >
          <IconTrash className="size-4" aria-hidden="true" />
        </Button>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${item.content.title}`}
          disabled={disabled}
          className="focus-visible:ring-ring cursor-grab rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50"
        >
          <IconGripVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}
