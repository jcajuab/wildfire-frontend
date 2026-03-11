"use client";

import { type ReactElement, memo } from "react";
import {
  IconDotsVertical,
  IconPlaylist,
  IconClock,
  IconPencil,
  IconEye,
  IconTrash,
  IconListDetails,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Playlist } from "@/types/playlist";
import { formatDuration, formatItemDuration } from "@/lib/formatters";

interface PlaylistCardProps {
  readonly playlist: Playlist;
  readonly onEdit?: (playlist: Playlist) => void;
  readonly onManageItems?: (playlist: Playlist) => void;
  readonly onPreview?: (playlist: Playlist) => void;
  readonly onDelete?: (playlist: Playlist) => void;
}

export const PlaylistCard = memo(function PlaylistCard({
  playlist,
  onEdit,
  onManageItems,
  onPreview,
  onDelete,
}: PlaylistCardProps): ReactElement {
  // Show first 4 items as thumbnails
  const visibleItems = playlist.items.slice(0, 4);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold leading-tight">
            {playlist.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            by {playlist.owner.name}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${playlist.name}`}
            >
              <IconDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(playlist)}>
                <IconPencil className="size-4" />
                Edit Playlist Info
              </DropdownMenuItem>
            ) : null}
            {onManageItems ? (
              <DropdownMenuItem onClick={() => onManageItems(playlist)}>
                <IconListDetails className="size-4" />
                Manage Items
              </DropdownMenuItem>
            ) : null}
            {onPreview ? (
              <DropdownMenuItem onClick={() => onPreview(playlist)}>
                <IconEye className="size-4" />
                Preview Playlist
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
      <p className="text-xs text-muted-foreground">
        {playlist.description ?? "No description provided."}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <IconPlaylist className="size-4" />
          {playlist.itemsCount} items
        </span>
        <span className="flex items-center gap-1">
          <IconClock className="size-4" />
          {formatDuration(playlist.totalDuration)}
        </span>
      </div>

      {/* Content Thumbnails */}
      {visibleItems.length > 0 && (
        <div className="flex gap-2">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="relative flex w-20 flex-col overflow-hidden rounded"
            >
              {/* Thumbnail */}
              <div className="relative flex aspect-video items-center justify-center bg-muted">
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
        </div>
      )}
    </div>
  );
});
