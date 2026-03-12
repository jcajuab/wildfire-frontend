"use client";

import type { ReactElement } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatLongDate, formatMonthDay } from "@/lib/formatters";
import type { CalendarView, ResourceMode } from "@/types/schedule";

interface CalendarHeaderProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
  readonly resourcesCount: number;
  readonly resourceMode: ResourceMode;
  readonly onResourceModeChange: (mode: ResourceMode) => void;
  readonly displayGroupsCount: number;
}

function formatDateRange(date: Date, view: CalendarView): string {
  if (view === "resource-day") {
    return formatLongDate(date);
  }

  if (view === "resource-week") {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = formatMonthDay(start);
    const endStr = formatMonthDay(end);

    if (start.getFullYear() !== end.getFullYear()) {
      return `${startStr}, ${start.getFullYear()} - ${endStr}, ${end.getFullYear()}`;
    }
    return `${startStr} - ${endStr}, ${start.getFullYear()}`;
  }

  return "";
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  resourcesCount,
  resourceMode,
  onResourceModeChange,
  displayGroupsCount,
}: CalendarHeaderProps): ReactElement {
  const label = formatDateRange(currentDate, view);

  const resourcesLabel =
    resourceMode === "display-group"
      ? `${displayGroupsCount} ${displayGroupsCount === 1 ? "group" : "groups"}`
      : `${resourcesCount} ${resourcesCount === 1 ? "display" : "displays"}`;

  return (
    <div className="grid w-full grid-cols-3 items-center gap-3">
      {/* Left: Today + Navigation */}
      <div className="flex justify-start">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="default" onClick={onToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            aria-label="Previous period"
          >
            <IconChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label="Next period"
          >
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Center: Date Range + Resource Count */}
      <div className="flex justify-center gap-2">
        <h2 className="truncate text-base font-semibold">{label}</h2>
        <span className="shrink-0 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          {resourcesLabel}
        </span>
      </div>

      {/* Right: Resource Mode Toggle + View Toggle */}
      <div className="flex justify-end gap-2">
        <ToggleGroup
          type="single"
          value={resourceMode}
          onValueChange={(value) => {
            if (value) {
              onResourceModeChange(value as ResourceMode);
            }
          }}
          variant="outline"
          size="default"
        >
          <ToggleGroupItem value="display">Display</ToggleGroupItem>
          <ToggleGroupItem value="display-group">Display Group</ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            if (value) {
              onViewChange(value as CalendarView);
            }
          }}
          variant="outline"
          size="default"
        >
          <ToggleGroupItem value="resource-week">Week</ToggleGroupItem>
          <ToggleGroupItem value="resource-day">Day</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
