"use client";

import { type ReactElement, memo } from "react";
import {
  IconDotsVertical,
  IconMapPin,
  IconEye,
  IconExternalLink,
  IconRefresh,
  IconEdit,
  IconPlayerPlay,
  IconPlayerPause,
} from "@tabler/icons-react";

import { getGroupBadgeStyles } from "@/lib/display-group-colors";
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
  readonly onRefreshPage?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
}

interface DisplayStatusStyles {
  readonly dotClassName: string;
  readonly labelClassName: string;
  readonly badgeClassName: string;
}

function getStatusStyles(status: DisplayStatus): DisplayStatusStyles {
  switch (status) {
    case "READY":
      return {
        dotClassName: "bg-[var(--success)]",
        labelClassName: "text-[var(--success)]",
        badgeClassName:
          "bg-[var(--success-muted)] text-[var(--success-foreground)]",
      };
    case "LIVE":
      return {
        dotClassName: "bg-primary",
        labelClassName: "text-primary",
        badgeClassName: "bg-primary/12 text-primary",
      };
    case "DOWN":
      return {
        dotClassName: "bg-[var(--warning)]",
        labelClassName: "text-[var(--warning-foreground)]",
        badgeClassName:
          "bg-[var(--warning-muted)] text-[var(--warning-foreground)]",
      };
    default:
      return {
        dotClassName: "bg-muted-foreground",
        labelClassName: "text-muted-foreground",
        badgeClassName: "bg-muted text-muted-foreground",
      };
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

function formatDuration(totalSeconds: number): string {
  const roundedSeconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const DisplayCard = memo(function DisplayCard({
  display,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onEditDisplay,
}: DisplayCardProps): ReactElement {
  const statusStyles = getStatusStyles(display.status);
  const nowPlaying = display.nowPlaying;
  const progress =
    nowPlaying != null && nowPlaying.duration > 0
      ? Math.min(
          100,
          Math.max(0, (nowPlaying.progress / nowPlaying.duration) * 100),
        )
      : 0;

  return (
    <article className="group flex flex-col gap-4 rounded-md border border-border bg-card/95 p-4 transition-colors duration-200 hover:border-primary/30 motion-reduce:transition-none">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-base font-semibold">{display.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${statusStyles.badgeClassName}`}
            >
              {getStatusLabel(display.status)}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <IconMapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{display.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
            {display.status === "LIVE" ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
            ) : null}
            <span
              className={`relative inline-flex size-2.5 rounded-full ${statusStyles.dotClassName}`}
            />
          </span>
          <span
            className={`text-xs font-medium ${statusStyles.labelClassName}`}
          >
            {getStatusLabel(display.status)}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${display.name}`}
              >
                <IconDotsVertical className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem onClick={() => onViewDetails(display)}>
                <IconEye className="size-4" aria-hidden="true" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPreviewPage(display)}>
                <IconExternalLink className="size-4" aria-hidden="true" />
                Preview Page
              </DropdownMenuItem>
              {onRefreshPage ? (
                <DropdownMenuItem onClick={() => onRefreshPage(display)}>
                  <IconRefresh className="size-4" aria-hidden="true" />
                  Refresh Page
                </DropdownMenuItem>
              ) : null}
              {onEditDisplay ? (
                <DropdownMenuItem onClick={() => onEditDisplay(display)}>
                  <IconEdit className="size-4" aria-hidden="true" />
                  Edit Display
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {display.groups.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {display.groups.map((group) => {
            const styles = getGroupBadgeStyles(group.colorIndex ?? 0);
            return (
              <Badge
                key={group.name}
                variant="secondary"
                className={`max-w-full truncate border text-xs ${styles.fill}`}
              >
                {group.name}
              </Badge>
            );
          })}
        </div>
      ) : null}

      <section className="space-y-2.5 rounded-md border border-border bg-muted/20 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Now Playing
        </p>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-background">
            {display.status === "LIVE" ? (
              <IconPlayerPlay
                className="size-4 text-primary"
                aria-hidden="true"
              />
            ) : (
              <IconPlayerPause
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="truncate text-sm font-medium">
              {nowPlaying?.title ?? "N/A"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Playlist: {nowPlaying?.playlist ?? "N/A"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {nowPlaying ? formatDuration(nowPlaying.progress) : "0:00"}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 rounded-md border border-border bg-background p-3">
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Display Output
          </p>
          <p className="truncate text-sm font-medium">
            {display.displayOutput}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Resolution
          </p>
          <p className="truncate text-sm font-medium">{display.resolution}</p>
        </div>
      </section>
    </article>
  );
});
