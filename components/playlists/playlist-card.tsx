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

interface PlaylistCardProps {
  readonly playlist: Playlist;
  readonly onEdit?: (playlist: Playlist) => void;
  readonly onManageItems?: (playlist: Playlist) => void;
  readonly onPreview?: (playlist: Playlist) => void;
  readonly onDelete?: (playlist: Playlist) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} sec`;
}

function formatItemDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `0:${remainingSeconds.toString().padStart(2, "0")}`;
}

export const PlaylistCard = memo(function PlaylistCard({
  playlist,
  onEdit,
  onManageItems,
  onPreview,
  onDelete,
  canUpdate = true,
  canDelete = true,
}: PlaylistCardProps): ReactElement {
  // Show first 4 items as thumbnails
  const visibleItems = playlist.items.slice(0, 4);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold leading-tight">
            {playlist.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            by {playlist.createdBy.name}
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
            {canUpdate && (
              <>
                <DropdownMenuItem onClick={() => onEdit?.(playlist)}>
                  <IconPencil className="size-4" />
                  Edit Playlist Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManageItems?.(playlist)}>
                  <IconListDetails className="size-4" />
                  Manage Items
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={() => onPreview?.(playlist)}>
              <IconEye className="size-4" />
              Preview Playlist
            </DropdownMenuItem>
            {canDelete && (
              <DropdownMenuItem
                onClick={() => onDelete?.(playlist)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="size-4" />
                Delete Playlist
              </DropdownMenuItem>
            )}
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
          <IconPlaylist className="size-3.5" />
          {playlist.items.length} items
        </span>
        <span className="flex items-center gap-1">
          <IconClock className="size-3.5" />
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
                <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  {formatItemDuration(item.duration)}
                </span>
              </div>
              {/* Title bar */}
              <div className="bg-primary px-1.5 py-1">
                <span className="block truncate text-[10px] font-medium text-primary-foreground">
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
