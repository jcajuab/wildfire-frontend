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
import type { Content } from "@/types/content";
import type { PlaylistItem } from "@/types/playlist";

type PlaylistSelectableContent = Content & {
  readonly type: PlaylistItem["content"]["type"];
};

interface DraftPlaylistItem {
  readonly id: string;
  readonly content: PlaylistSelectableContent;
  readonly duration: number;
  readonly order: number;
}

export interface SortablePlaylistItemProps {
  readonly item: DraftPlaylistItem;
  readonly onRemove: (id: string) => void;
  readonly onUpdateDuration: (id: string, duration: number) => void;
}

export function SortablePlaylistItem({
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
      <div
        data-testid="playlist-item-thumbnail"
        className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted"
      >
        {item.content.thumbnailUrl ? (
          <Image
            src={item.content.thumbnailUrl}
            alt={`${item.content.title} thumbnail`}
            fill
            unoptimized
            className="object-cover"
          />
        ) : (
          <IconPhoto className="size-5 text-muted-foreground" aria-hidden="true" />
        )}
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
