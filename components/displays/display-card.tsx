"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  memo,
} from "react";
import {
  IconAlertTriangle,
  IconDots,
  IconExternalLink,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import { GroupBadge } from "./group-badge";
import { DisplayPreview } from "./display-preview";
import type { Display, DisplayStatus } from "@/types/display";

// Caps the group chip row so it never wraps or needs layout measurement.
// Chosen to match the median display.groups.length in fixtures; tune here
// if product adds wider cards.
const MAX_VISIBLE_GROUPS = 2;
const META_BADGE_CLASSNAME = "h-6 shrink-0 px-2.5 text-[11px] leading-none";
const CARD_SELECTION_IGNORE_SELECTOR =
  "button,a,input,select,textarea,[role='button'],[role='menuitem'],[data-card-selection-ignore='true']";

interface DisplayCardProps {
  readonly display: Display;
  readonly onViewPage: (display: Display) => void;
  readonly onUnregisterDisplay?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
  readonly isGlobalEmergencyActive?: boolean;
  readonly isSelected?: boolean;
  readonly onSelectionChange?: (display: Display, checked: boolean) => void;
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

function shouldIgnoreCardSelection(
  target: EventTarget | null,
  currentTarget: HTMLElement,
): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(CARD_SELECTION_IGNORE_SELECTOR);
  return interactiveElement !== null && interactiveElement !== currentTarget;
}

export const DisplayCard = memo(function DisplayCard({
  display,
  onViewPage,
  onUnregisterDisplay,
  onEditDisplay,
  isGlobalEmergencyActive = false,
  isSelected = false,
  onSelectionChange,
}: DisplayCardProps): ReactElement {
  const statusStyles = getStatusStyles(display.status);
  const shouldPulse = display.status === "LIVE" || display.status === "READY";
  const statusLabel = getStatusLabel(display.status);
  const outputLabel = display.output.trim() || "Not available";
  const resolutionLabel = display.resolution.trim();
  const showResolution =
    resolutionLabel !== "" && resolutionLabel.toLowerCase() !== "not available";
  const isEmergencyContentMissing = display.emergencyContentId === null;

  const visibleGroups = display.groups.slice(0, MAX_VISIBLE_GROUPS);
  const hiddenGroupCount = Math.max(
    display.groups.length - visibleGroups.length,
    0,
  );
  const showSelection = Boolean(onUnregisterDisplay && onSelectionChange);
  const handleCardClick = (event: MouseEvent<HTMLElement>): void => {
    if (
      !showSelection ||
      shouldIgnoreCardSelection(event.target, event.currentTarget)
    ) {
      return;
    }

    onSelectionChange?.(display, !isSelected);
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
    onSelectionChange?.(display, !isSelected);
  };

  return (
    <div
      data-state={isSelected ? "selected" : undefined}
      data-selection-mode={showSelection ? "true" : undefined}
      data-selection-muted={
        showSelection && !isSelected ? "true" : undefined
      }
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={showSelection ? "button" : undefined}
      tabIndex={showSelection ? 0 : undefined}
      aria-pressed={showSelection ? isSelected : undefined}
      aria-label={showSelection ? `Select ${display.name}` : undefined}
      className={`group flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 transition-[border-color,background-color,filter,opacity] duration-200 hover:border-primary/25 data-[state=selected]:border-primary/60 data-[state=selected]:bg-primary/5 data-[state=selected]:opacity-100 data-[state=selected]:grayscale-0 motion-reduce:transition-none ${showSelection ? "cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" : ""} ${showSelection && !isSelected ? "border-border/60 bg-muted/25 opacity-55 grayscale hover:border-primary/35 hover:bg-card hover:opacity-90 hover:grayscale-0" : ""}`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showSelection ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelectionChange?.(display, checked === true)
              }
              aria-label={`Select ${display.name}`}
              data-card-selection-ignore="true"
            />
          ) : null}
          <h2 className="truncate text-base font-semibold leading-tight">
            {display.name}
          </h2>
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
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
            {isEmergencyContentMissing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    role="img"
                    className="inline-flex size-5 items-center justify-center rounded-full text-amber-700"
                    aria-label="Emergency content not set"
                  >
                    <IconAlertTriangle
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Emergency content not set</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${display.name}`}
              >
                <IconDots className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
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
              {onUnregisterDisplay ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onUnregisterDisplay(display)}
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

      <div className="flex min-h-6 min-w-0 items-center gap-1.5">
        <Badge
          variant="outline"
          className={`${META_BADGE_CLASSNAME} bg-background text-foreground`}
        >
          {outputLabel}
        </Badge>
        {showResolution ? (
          <Badge
            variant="outline"
            className={`${META_BADGE_CLASSNAME} bg-background text-foreground`}
          >
            {resolutionLabel}
          </Badge>
        ) : null}
        <Separator orientation="vertical" className="h-4 bg-border/80" />
        {isGlobalEmergencyActive ? (
          <Badge variant="destructive" className={META_BADGE_CLASSNAME}>
            Emergency Active
          </Badge>
        ) : null}
        <div
          data-group-overflow-container="true"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
        >
          {display.groups.length > 0 ? (
            <>
              {visibleGroups.map((group) => (
                <span
                  key={group.name}
                  data-group-visible={group.name}
                  className="inline-flex min-w-0"
                >
                  <GroupBadge name={group.name} />
                </span>
              ))}
              {hiddenGroupCount > 0 ? (
                <span data-group-overflow-visible={String(hiddenGroupCount)}>
                  <GroupBadge name={`+${hiddenGroupCount}`} />
                </span>
              ) : null}
            </>
          ) : (
            <Badge variant="secondary" className={META_BADGE_CLASSNAME}>
              Ungrouped
            </Badge>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background aspect-[16/8.5]">
        <div className="h-full w-full">
          <DisplayPreview
            displayId={display.id}
            displayName={display.name}
            displayStatus={display.status}
          />
        </div>
      </div>
    </div>
  );
});
