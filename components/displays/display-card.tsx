"use client";

import { type ReactElement, memo } from "react";
import {
  IconDotsVertical,
  IconMapPin,
  IconEye,
  IconExternalLink,
  IconRefresh,
  IconToggleLeft,
  IconTrash,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Display, DisplayStatus } from "@/types/display";

interface DisplayCardProps {
  readonly display: Display;
  readonly onViewDetails: (display: Display) => void;
  readonly onPreviewPage: (display: Display) => void;
  readonly onRefreshPage: (display: Display) => void;
  readonly onToggleDisplay: (display: Display) => void;
  readonly onRemoveDisplay: (display: Display) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

function getStatusColor(status: DisplayStatus): string {
  switch (status) {
    case "READY":
      return "bg-emerald-500";
    case "LIVE":
      return "bg-destructive";
    case "DOWN":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground";
  }
}

function getStatusLabel(status: DisplayStatus): string {
  switch (status) {
    case "READY":
      return "Ready";
    case "LIVE":
      return "Live";
    case "DOWN":
      return "Down";
    default:
      return status;
  }
}

function getStatusTextColor(status: DisplayStatus): string {
  switch (status) {
    case "READY":
      return "text-emerald-600 dark:text-emerald-400";
    case "LIVE":
      return "text-destructive";
    case "DOWN":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const DisplayCard = memo(function DisplayCard({
  display,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onToggleDisplay,
  onRemoveDisplay,
  canUpdate = true,
  canDelete = true,
}: DisplayCardProps): ReactElement {
  const nowPlaying = display.nowPlaying;
  const progress = nowPlaying
    ? (nowPlaying.progress / nowPlaying.duration) * 100
    : 0;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{display.name}</h3>
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2.5" aria-hidden="true">
                {display.status === "LIVE" ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                ) : null}
                <span
                  className={`relative inline-flex size-2.5 rounded-full ${getStatusColor(
                    display.status,
                  )}`}
                />
              </span>
              <span
                className={`text-xs font-medium ${getStatusTextColor(display.status)}`}
              >
                {getStatusLabel(display.status)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconMapPin className="size-3" />
            <span>{display.location}</span>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${display.name}`}
            >
              <IconDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={() => onViewDetails(display)}>
              <IconEye className="size-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreviewPage(display)}>
              <IconExternalLink className="size-4" />
              Preview Page
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRefreshPage(display)}>
              <IconRefresh className="size-4" />
              Refresh Page
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem onClick={() => onToggleDisplay(display)}>
                <IconToggleLeft className="size-4" />
                Edit Display
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => onRemoveDisplay(display)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="size-4" />
                Remove Display
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tags */}
      {display.groups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {display.groups.map((group) => (
            <Badge key={group} variant="secondary" className="text-xs">
              {group}
            </Badge>
          ))}
        </div>
      )}

      {/* Now Playing section */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Now Playing
        </p>
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
            {display.status === "LIVE" ? (
              <IconPlayerPlay className="size-4 text-muted-foreground" />
            ) : (
              <IconPlayerPause className="size-4 text-muted-foreground" />
            )}
          </div>
          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-sm font-medium">
              {nowPlaying?.title ?? "N/A"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              From playlist: {nowPlaying?.playlist ?? "N/A"}
            </p>
          </div>
          {/* Duration */}
          <span className="shrink-0 text-xs text-muted-foreground">
            {nowPlaying ? formatDuration(nowPlaying.progress) : "0:00"}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Display info */}
      <div className="grid grid-cols-2 gap-4 border-t pt-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Display Output
          </p>
          <p className="text-sm font-medium">{display.displayOutput}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Resolution
          </p>
          <p className="text-sm font-medium">{display.resolution}</p>
        </div>
      </div>
    </div>
  );
});
