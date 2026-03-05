"use client";

import { type ReactElement, memo } from "react";
import {
  IconAlertTriangle,
  IconDotsVertical,
  IconEye,
  IconExternalLink,
  IconEdit,
  IconTrash,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Display, DisplayStatus } from "@/types/display";

interface DisplayCardProps {
  readonly display: Display;
  readonly onViewDetails: (display: Display) => void;
  readonly onViewPage: (display: Display) => void;
  readonly onUnregisterDisplay?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
  readonly onActivateEmergency?: (display: Display) => void;
  readonly onDeactivateEmergency?: (display: Display) => void;
  readonly isGlobalEmergencyActive?: boolean;
}

interface DisplayStatusStyles {
  readonly dotClassName: string;
  readonly pulseClassName: string;
}

function getStatusStyles(status: DisplayStatus): DisplayStatusStyles {
  switch (status) {
    case "PROCESSING":
      return {
        dotClassName: "bg-amber-500",
        pulseClassName: "bg-amber-500",
      };
    case "READY":
      return {
        dotClassName: "bg-green-500",
        pulseClassName: "bg-green-500",
      };
    case "LIVE":
      return {
        dotClassName: "bg-red-500",
        pulseClassName: "bg-red-500",
      };
    case "DOWN":
      return {
        dotClassName: "bg-slate-400",
        pulseClassName: "bg-slate-400",
      };
    default:
      return {
        dotClassName: "bg-muted-foreground",
        pulseClassName: "bg-muted-foreground",
      };
  }
}

function getStatusLabel(status: DisplayStatus): string {
  switch (status) {
    case "PROCESSING":
      return "Processing";
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
  onViewPage,
  onUnregisterDisplay,
  onEditDisplay,
  onActivateEmergency,
  onDeactivateEmergency,
  isGlobalEmergencyActive = false,
}: DisplayCardProps): ReactElement {
  const statusStyles = getStatusStyles(display.status);
  const nowPlaying = display.nowPlaying;
  const shouldPulse = display.status === "LIVE" || display.status === "READY";
  const statusLabel = getStatusLabel(display.status);
  const isEmergencyActive =
    isGlobalEmergencyActive || display.localEmergencyActive;
  const durationLabel =
    nowPlaying != null && nowPlaying.duration > 0
      ? formatDuration(nowPlaying.duration)
      : "N/A";

  return (
    <article className="group flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 transition-colors duration-200 hover:border-primary/25 motion-reduce:transition-none">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold leading-none">
            {display.name}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="relative inline-flex size-4 shrink-0 cursor-default items-center justify-center"
                aria-label={statusLabel}
              >
                {shouldPulse ? (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full ${statusStyles.pulseClassName} opacity-55 motion-reduce:animate-none`}
                  />
                ) : null}
                <span
                  className={`relative inline-flex size-2.5 rounded-full ${statusStyles.dotClassName}`}
                  aria-hidden="true"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{statusLabel}</TooltipContent>
          </Tooltip>

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
                More Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewPage(display)}>
                <IconExternalLink className="size-4" aria-hidden="true" />
                View Page
              </DropdownMenuItem>
              {onEditDisplay ? (
                <DropdownMenuItem onClick={() => onEditDisplay(display)}>
                  <IconEdit className="size-4" aria-hidden="true" />
                  Edit Display
                </DropdownMenuItem>
              ) : null}
              {onActivateEmergency || onDeactivateEmergency ? (
                <>
                  <DropdownMenuSeparator />
                  {isEmergencyActive ? (
                    <DropdownMenuItem
                      onClick={() => onDeactivateEmergency?.(display)}
                    >
                      <IconAlertTriangle
                        className="size-4"
                        aria-hidden="true"
                      />
                      Stop Emergency
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onActivateEmergency?.(display)}
                    >
                      <IconAlertTriangle
                        className="size-4"
                        aria-hidden="true"
                      />
                      Start Emergency
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
              {onUnregisterDisplay ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onUnregisterDisplay(display)}
                    className="text-destructive focus:text-destructive"
                  >
                    <IconTrash className="size-4" aria-hidden="true" />
                    Unregister Display
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-6 flex-wrap gap-1.5">
        {isEmergencyActive ? (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Emergency Active
          </Badge>
        ) : null}
        {display.groups.length > 0 ? (
          display.groups.map((group) => {
            const styles = getGroupBadgeStyles(group.colorIndex ?? 0);
            return (
              <Badge
                key={group.name}
                variant="secondary"
                className={`max-w-full truncate border text-[11px] font-medium ${styles.fill}`}
              >
                {group.name}
              </Badge>
            );
          })
        ) : (
          <Badge
            variant="secondary"
            className="border border-border/70 bg-muted/40 text-[11px] font-medium text-muted-foreground"
          >
            Ungrouped
          </Badge>
        )}
      </div>

      <section className="space-y-2 rounded-lg border border-border/80 bg-muted/15 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
          Now Playing
        </p>
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-2.5">
          {display.status === "LIVE" ? (
            <IconPlayerPlay
              className="size-8 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : (
            <IconPlayerPause
              className="size-8 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-base font-semibold leading-tight">
              {nowPlaying?.title ?? "N/A"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              Duration: {durationLabel}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              Playlist: {nowPlaying?.playlist ?? "N/A"}
            </p>
          </div>
        </div>
      </section>
    </article>
  );
});
