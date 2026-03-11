"use client";

import { type ReactElement, memo, useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconDots,
  IconEye,
  IconExternalLink,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";

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
import { DisplayPreview } from "./display-preview";
import type { Display, DisplayStatus } from "@/types/display";

const GROUP_GAP_PX = 6;

function getVisibleGroupCount(
  groupWidths: number[],
  overflowWidths: number[],
  containerWidth: number,
): number {
  if (groupWidths.length === 0 || containerWidth <= 0) {
    return groupWidths.length;
  }

  for (let visibleCount = groupWidths.length; visibleCount >= 0; visibleCount -= 1) {
    const hiddenCount = groupWidths.length - visibleCount;
    const visibleWidth = groupWidths.slice(0, visibleCount).reduce((sum, width) => sum + width, 0);
    const visibleGapWidth = visibleCount > 1 ? (visibleCount - 1) * GROUP_GAP_PX : 0;
    const overflowBadgeWidth = hiddenCount > 0 ? (overflowWidths[hiddenCount - 1] ?? 0) : 0;
    const overflowGapWidth = hiddenCount > 0 && visibleCount > 0 ? GROUP_GAP_PX : 0;

    if (visibleWidth + visibleGapWidth + overflowBadgeWidth + overflowGapWidth <= containerWidth) {
      return visibleCount;
    }
  }

  return 0;
}

interface DisplayCardProps {
  readonly display: Display;
  readonly onViewDetails: (display: Display) => void;
  readonly onViewPage: (display: Display) => void;
  readonly onUnregisterDisplay?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
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

export const DisplayCard = memo(function DisplayCard({
  display,
  onViewDetails,
  onViewPage,
  onUnregisterDisplay,
  onEditDisplay,
  isGlobalEmergencyActive = false,
}: DisplayCardProps): ReactElement {
  const statusStyles = getStatusStyles(display.status);
  const shouldPulse = display.status === "LIVE" || display.status === "READY";
  const statusLabel = getStatusLabel(display.status);
  const outputLabel = display.output.trim() || "Not available";
  const resolutionLabel = display.resolution.trim();
  const showResolution =
    resolutionLabel !== "" && resolutionLabel.toLowerCase() !== "not available";
  const isEmergencyContentMissing = display.emergencyContentId === null;
  const groupOverflowContainerRef = useRef<HTMLDivElement | null>(null);
  const groupMeasureRef = useRef<HTMLDivElement | null>(null);
  const [visibleGroupCount, setVisibleGroupCount] = useState(display.groups.length);

  useEffect(() => {
    const updateVisibleGroups = () => {
      const container = groupOverflowContainerRef.current;
      const measureRoot = groupMeasureRef.current;
      if (!container || !measureRoot) {
        return;
      }

      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) {
        setVisibleGroupCount(display.groups.length);
        return;
      }

      const groupWidths = Array.from(
        measureRoot.querySelectorAll<HTMLElement>("[data-group-measure]"),
      ).map((node) => node.getBoundingClientRect().width);

      const overflowWidths = Array.from(
        measureRoot.querySelectorAll<HTMLElement>("[data-group-overflow-measure]"),
      ).map((node) => node.getBoundingClientRect().width);

      setVisibleGroupCount(
        getVisibleGroupCount(groupWidths, overflowWidths, containerWidth),
      );
    };

    updateVisibleGroups();

    const observer = new ResizeObserver(() => {
      updateVisibleGroups();
    });

    if (groupOverflowContainerRef.current) {
      observer.observe(groupOverflowContainerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [display.groups]);

  const visibleGroups = display.groups.slice(0, visibleGroupCount);
  const hiddenGroupCount = Math.max(display.groups.length - visibleGroups.length, 0);

  return (
    <article className="group flex h-full flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 transition-colors duration-200 hover:border-primary/25 motion-reduce:transition-none">
      <header className="flex justify-between items-center gap-3">
        <div className="min-w-0 flex gap-3 items-center">
          <h3 className="truncate text-lg font-semibold leading-none">
            {display.name}
          </h3>
          <div className="flex items-center gap-1.5">
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
            {isEmergencyContentMissing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex size-5 items-center justify-center rounded-full text-amber-700"
                    aria-label="Emergency not set"
                  >
                    <IconAlertTriangle className="size-3.5" aria-hidden="true" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Emergency not set</TooltipContent>
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
        <Badge variant="outline" className="bg-background text-foreground">
          {outputLabel}
        </Badge>
        {showResolution ? (
          <Badge variant="outline" className="bg-background text-foreground">
            {resolutionLabel}
          </Badge>
        ) : null}
        <span className="text-muted-foreground">|</span>
        {isGlobalEmergencyActive ? (
          <Badge variant="destructive">Emergency Active</Badge>
        ) : null}
        <div
          ref={groupOverflowContainerRef}
          data-group-overflow-container="true"
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden"
        >
          {display.groups.length > 0 ? (
            <>
              {visibleGroups.map((group) => (
                <Badge
                  key={group.name}
                  data-group-visible={group.name}
                  variant="secondary"
                  className="max-w-full shrink-0 truncate border border-blue-200 bg-blue-600 text-white"
                >
                  {group.name}
                </Badge>
              ))}
              {hiddenGroupCount > 0 ? (
                <Badge
                  data-group-overflow-visible={String(hiddenGroupCount)}
                  variant="secondary"
                  className="shrink-0 border border-blue-200 bg-blue-600 text-white"
                >
                  +{hiddenGroupCount}
                </Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="secondary">Ungrouped</Badge>
          )}
        </div>
      </div>

      <div ref={groupMeasureRef} className="invisible absolute -z-10 flex gap-1.5">
        {display.groups.map((group) => (
          <Badge
            key={`measure-${group.name}`}
            data-group-measure={group.name}
            variant="secondary"
            className="shrink-0 border border-blue-200 bg-blue-600 text-white"
          >
            {group.name}
          </Badge>
        ))}
        {display.groups.slice(1).map((_, index) => {
          const hiddenCount = index + 1;
          return (
            <Badge
              key={`measure-overflow-${hiddenCount}`}
              data-group-overflow-measure={String(hiddenCount)}
              variant="secondary"
              className="shrink-0 border border-blue-200 bg-blue-600 text-white"
            >
              +{hiddenCount}
            </Badge>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-background aspect-[16/8.5]">
        <div className="h-full w-full">
          <DisplayPreview displayId={display.id} displayName={display.name} />
        </div>
      </div>
    </article>
  );
});
