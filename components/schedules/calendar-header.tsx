"use client";

import type { ReactElement } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { CalendarView } from "@/types/schedule";

interface CalendarHeaderProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
  readonly resourcesCount: number;
}

function getStartOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function formatDateRange(date: Date, view: CalendarView): string {
  if (view === "resource-day") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (view === "resource-week") {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const endStr = end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

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
}: CalendarHeaderProps): ReactElement {
  const label = formatDateRange(currentDate, view);
  const resourcesLabel = `${resourcesCount} ${
    resourcesCount === 1 ? "display" : "displays"
  }`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
      {/* Left: Today + Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onPrev}
          aria-label="Previous period"
        >
          <IconChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onNext}
          aria-label="Next period"
        >
          <IconChevronRight className="size-4" />
        </Button>
      </div>

      {/* Center: Date Range + Resource Count */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-2">
        <h2 className="truncate text-base font-semibold">{label}</h2>
        <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          {resourcesLabel}
        </span>
      </div>

      {/* Right: View Toggle */}
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(value) => {
          if (value) {
            onViewChange(value as CalendarView);
          }
        }}
        variant="outline"
        size="sm"
      >
        <ToggleGroupItem value="resource-week">Resource Week</ToggleGroupItem>
        <ToggleGroupItem value="resource-day">Resource Day</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
