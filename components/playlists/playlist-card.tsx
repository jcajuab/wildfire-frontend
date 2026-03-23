"use client";

import { type ReactElement, memo } from "react";
import Image from "next/image";
import {
  IconDots,
  IconPlaylist,
  IconClock,
  IconPhoto,
  IconTrash,
  IconListDetails,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlaylistSummary } from "@/types/playlist";
import {
  formatDateWithTime,
  formatDuration,
  formatItemDuration,
} from "@/lib/formatters";
import { sanitizeRichTextHtml } from "@/lib/content-thumbnail-preview";
import { cn } from "@/lib/utils";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";

interface PlaylistCardProps {
  readonly playlist: PlaylistSummary;
  readonly onEdit?: (playlist: PlaylistSummary) => void;
  readonly onDelete?: (playlist: PlaylistSummary) => void;
}

export const PlaylistCard = memo(function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
}: PlaylistCardProps): ReactElement {
  const visiblePreviewItems = playlist.previewItems.slice(0, 3);
  const overflowCount = playlist.itemsCount - visiblePreviewItems.length;
  const createdAtLabel = formatDateWithTime(playlist.createdAt);
  const updatedAtLabel = formatDateWithTime(playlist.updatedAt);

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold leading-tight">
              {playlist.name}
            </h2>
            {playlist.status === "IN_USE" && (
              <Badge variant="destructive" className="border-destructive/30">
                In Use
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            @{playlist.owner.name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${playlist.name}`}
            >
              <IconDots className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(playlist)}>
                <IconListDetails className="size-4" />
                Edit Playlist
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(playlist)}
              >
                <IconTrash className="size-4" />
                Delete Playlist
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      <p
        className="truncate text-xs text-muted-foreground"
        title={playlist.description ?? "No description provided."}
      >
        {playlist.description ?? "No description provided."}
      </p>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="gap-1">
          <IconPlaylist className="size-4" />
          {playlist.itemsCount} items
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <IconClock className="size-4" />
          {formatDuration(playlist.totalDuration)}
        </Badge>
      </div>

      {/* Content Thumbnails */}
      {visiblePreviewItems.length > 0 && (
        <div className="flex gap-2">
          {visiblePreviewItems.map((item) => (
            <div
              key={item.id}
              className="relative flex w-20 flex-col overflow-hidden rounded"
            >
              {/* Thumbnail */}
              <div className="relative flex aspect-video items-center justify-center bg-muted">
                {item.content.thumbnailUrl ? (
                  <Image
                    src={item.content.thumbnailUrl}
                    alt={`${item.content.title} thumbnail`}
                    fill
                    className="object-cover"
                  />
                ) : item.content.type === "TEXT" &&
                  item.content.textHtmlContent ? (
                  <div className="flex size-full items-start overflow-hidden p-1">
                    <div
                      className={cn(
                        RICH_TEXT_PREVIEW_CLASSES,
                        "text-[6px] leading-tight [&_ol]:ml-2 [&_td]:px-0.5 [&_th]:px-0.5 [&_ul]:ml-2",
                      )}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichTextHtml(
                          item.content.textHtmlContent,
                        ),
                      }}
                    />
                  </div>
                ) : (
                  <IconPhoto
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
                <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-xs text-white">
                  {formatItemDuration(item.duration)}
                </span>
              </div>
              {/* Title bar */}
              <div className="bg-primary px-1.5 py-1">
                <span className="block truncate text-xs font-medium text-primary-foreground">
                  {item.content.title}
                </span>
              </div>
            </div>
          ))}
          {overflowCount > 0 ? (
            <div className="flex w-20 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
              +{overflowCount}
            </div>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          Created at
        </span>
        <span className="text-xs text-muted-foreground">{createdAtLabel}</span>
        <span className="text-xs font-medium text-muted-foreground">
          Updated at
        </span>
        <span className="text-xs text-muted-foreground">{updatedAtLabel}</span>
      </div>
    </article>
  );
});
