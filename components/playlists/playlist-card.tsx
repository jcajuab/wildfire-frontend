"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  memo,
} from "react";
import Image from "next/image";
import {
  IconDots,
  IconPhoto,
  IconTrash,
  IconListDetails,
} from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlaylistSummary } from "@/types/playlist";
import {
  formatDateWithTime,
  formatDuration,
  formatRelativeTime,
} from "@/lib/formatters";
import { getTextThumbnailText } from "@/lib/content-thumbnail-preview";
import { useCanModifyResource } from "@/hooks/use-can-modify-resource";

interface PlaylistCardProps {
  readonly playlist: PlaylistSummary;
  readonly onEdit?: (playlist: PlaylistSummary) => void;
  readonly onDelete?: (playlist: PlaylistSummary) => void;
  readonly isSelected?: boolean;
  readonly onSelectionChange?: (
    playlist: PlaylistSummary,
    checked: boolean,
  ) => void;
  readonly isSelectionMode?: boolean;
}

const CARD_SELECTION_IGNORE_SELECTOR =
  "button,a,input,select,textarea,[role='button'],[role='menuitem'],[data-card-selection-ignore='true']";
const MAX_VISIBLE_PREVIEW_ITEMS = 2;
const PLAYLIST_META_BADGE_CLASSNAME =
  "border-foreground/15 bg-background text-foreground";
const PLAYLIST_IN_USE_BADGE_CLASSNAME =
  "border-destructive/30 bg-destructive/10 text-destructive";
const PLAYLIST_DRAFT_BADGE_CLASSNAME =
  "border-border bg-muted/70 text-muted-foreground";

function shouldIgnoreCardSelection(
  target: EventTarget | null,
  currentTarget: HTMLElement,
): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(CARD_SELECTION_IGNORE_SELECTOR);
  return interactiveElement !== null && interactiveElement !== currentTarget;
}

function getPlaylistActivityLabel(
  playlist: PlaylistSummary,
): "Created" | "Updated" {
  return new Date(playlist.updatedAt).getTime() >
    new Date(playlist.createdAt).getTime()
    ? "Updated"
    : "Created";
}

function getPlaylistOwnerHandle(playlist: PlaylistSummary): string {
  const username = playlist.owner.username?.trim();
  return username && username.length > 0 ? username : playlist.owner.name;
}

function getPlaylistStatusBadgeClassName(
  status: PlaylistSummary["status"],
): string {
  return status === "IN_USE"
    ? PLAYLIST_IN_USE_BADGE_CLASSNAME
    : PLAYLIST_DRAFT_BADGE_CLASSNAME;
}

export const PlaylistCard = memo(function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  isSelected = false,
  onSelectionChange,
  isSelectionMode = false,
}: PlaylistCardProps): ReactElement {
  const canModify = useCanModifyResource(playlist.owner.id);
  const visiblePreviewItems = playlist.previewItems.slice(
    0,
    MAX_VISIBLE_PREVIEW_ITEMS,
  );
  const overflowCount = playlist.itemsCount - visiblePreviewItems.length;
  const activityLabel = getPlaylistActivityLabel(playlist);
  const activityDate =
    activityLabel === "Updated" ? playlist.updatedAt : playlist.createdAt;
  const activityDateLabel = formatDateWithTime(activityDate);
  const activityRelativeLabel = formatRelativeTime(activityDate);
  const ownerHandle = getPlaylistOwnerHandle(playlist);
  const statusLabel = playlist.status === "IN_USE" ? "In Use" : "Draft";
  const showEdit = canModify && Boolean(onEdit);
  const showDelete = canModify && Boolean(onDelete);
  const showSelection = canModify && Boolean(onSelectionChange);
  const handleCardClick = (event: MouseEvent<HTMLElement>): void => {
    if (
      !showSelection ||
      shouldIgnoreCardSelection(event.target, event.currentTarget)
    ) {
      return;
    }

    onSelectionChange?.(playlist, !isSelected);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (
      !showSelection ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onSelectionChange?.(playlist, !isSelected);
  };

  return (
    <div
      data-state={isSelected ? "selected" : undefined}
      data-selection-mode={showSelection ? "true" : undefined}
      data-selection-muted={showSelection && !isSelected ? "true" : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={showSelection ? "button" : undefined}
      tabIndex={showSelection ? 0 : undefined}
      aria-pressed={showSelection ? isSelected : undefined}
      aria-label={showSelection ? `Select ${playlist.name}` : undefined}
      className={`group flex h-full flex-col gap-2.5 rounded-xl border border-border/80 bg-card p-4 transition-[border-color,background-color,filter,opacity] duration-200 hover:border-border data-[state=selected]:border-primary/60 data-[state=selected]:bg-primary/5 data-[state=selected]:opacity-100 data-[state=selected]:grayscale-0 motion-reduce:transition-none ${showSelection ? "cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" : ""} ${showSelection && !isSelected ? "border-border/60 bg-muted/25 opacity-55 grayscale hover:border-border hover:bg-card hover:opacity-90 hover:grayscale-0" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {showSelection ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) =>
              onSelectionChange?.(playlist, checked === true)
            }
            aria-label={`Select ${playlist.name}`}
            data-card-selection-ignore="true"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold leading-tight">
              {playlist.name}
            </h2>
          </div>
        </div>
        {showEdit || showDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${playlist.name}`}
                className="shrink-0"
                disabled={isSelectionMode}
              >
                <IconDots className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)]"
            >
              {showEdit && onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(playlist)}>
                  <IconListDetails className="size-4" />
                  Edit Playlist
                </DropdownMenuItem>
              ) : null}
              {showEdit && showDelete ? <DropdownMenuSeparator /> : null}
              {showDelete && onDelete ? (
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
        ) : null}
      </div>

      {/* Description */}
      <p
        className="truncate text-xs leading-4 text-muted-foreground"
        title={playlist.description ?? "No description provided."}
      >
        {playlist.description ?? "No description provided."}
      </p>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Badge
          variant="outline"
          className={getPlaylistStatusBadgeClassName(playlist.status)}
        >
          {statusLabel}
        </Badge>
        <Badge variant="outline" className={PLAYLIST_META_BADGE_CLASSNAME}>
          {playlist.itemsCount} {playlist.itemsCount === 1 ? "item" : "items"}
        </Badge>
        <Badge variant="outline" className={PLAYLIST_META_BADGE_CLASSNAME}>
          {formatDuration(playlist.totalDuration)} sec
        </Badge>
      </div>

      {/* Content Thumbnails */}
      {visiblePreviewItems.length > 0 && (
        <div
          className={
            overflowCount > 0
              ? "grid grid-cols-3 gap-2 pt-0.5"
              : "grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2 pt-0.5"
          }
        >
          {visiblePreviewItems.map((item) => (
            <div
              key={item.id}
              className="relative flex h-[3.75rem] min-w-0 flex-col overflow-hidden rounded"
            >
              {/* Thumbnail */}
              <div className="relative flex h-10 shrink-0 items-center justify-center overflow-hidden bg-muted">
                {item.content.thumbnailUrl ? (
                  <Image
                    src={item.content.thumbnailUrl}
                    alt={`${item.content.title} thumbnail`}
                    fill
                    className="object-cover"
                  />
                ) : item.content.type === "TEXT" &&
                  (item.content.textPreviewText ||
                    item.content.textHtmlContent) ? (
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
                <span className="absolute right-1 top-1 rounded bg-black/60 px-1 py-0.5 text-xs text-white">
                  {formatDuration(item.duration)}
                </span>
              </div>
              {/* Title bar */}
              <div className="flex h-5 items-center bg-primary px-1.5">
                <span className="block min-w-0 truncate text-xs font-medium text-primary-foreground">
                  {item.content.title}
                </span>
              </div>
            </div>
          ))}
          {overflowCount > 0 ? (
            <div className="flex h-[3.75rem] min-w-0 items-center justify-center rounded bg-muted text-xs font-medium text-foreground/80">
              +{overflowCount}
            </div>
          ) : null}
        </div>
      )}

      <div
        className="flex min-w-0 items-center gap-1.5 pt-0.5 text-xs leading-4 text-muted-foreground"
        title={`${activityLabel} ${activityDateLabel}`}
        aria-label={`Created by @${ownerHandle}. ${activityLabel} ${activityDateLabel}.`}
      >
        <span className="min-w-0 truncate">@{ownerHandle}</span>
        <span className="shrink-0 text-muted-foreground/70" aria-hidden="true">
          ·
        </span>
        <span className="shrink-0 font-medium">{activityLabel}</span>
        <span className="min-w-0 truncate">{activityRelativeLabel}</span>
      </div>
    </div>
  );
});
