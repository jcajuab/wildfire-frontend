"use client";

import type { ReactElement, ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatLongDate, formatMonthDay } from "@/lib/formatters";
import type { CalendarView, ResourceMode } from "@/types/schedule";

interface CalendarHeaderProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly resourceMode: ResourceMode;
  readonly onResourceModeChange: (mode: ResourceMode) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
}

function formatDateRange(date: Date, view: CalendarView): ReactNode {
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
      return (
        <>
          {startStr}
          <span className="max-[52rem]:hidden">, {start.getFullYear()}</span>
          {" - "}
          {endStr}
          <span className="max-[52rem]:hidden">, {end.getFullYear()}</span>
        </>
      );
    }
    return (
      <>
        {startStr} - {endStr}
        <span className="max-[52rem]:hidden">, {start.getFullYear()}</span>
      </>
    );
  }

  return "";
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  resourceMode,
  onResourceModeChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps): ReactElement {
  const label = formatDateRange(currentDate, view);

  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
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
            <IconChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            aria-label="Next period"
          >
            <IconChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-start sm:justify-center">
        <h2 className="truncate text-base font-semibold">{label}</h2>
      </div>

      <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
        <ToggleGroup
          type="single"
          value={resourceMode}
          onValueChange={(nextMode) => {
            if (nextMode) onResourceModeChange(nextMode as ResourceMode);
          }}
          variant="outline"
          aria-label="Schedule resources"
        >
          <ToggleGroupItem value="display" aria-label="Displays">
            Displays
          </ToggleGroupItem>
          <ToggleGroupItem value="display-group" aria-label="Display groups">
            Groups
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(nextView) => {
            if (nextView) onViewChange(nextView as CalendarView);
          }}
          variant="outline"
          aria-label="Calendar view"
        >
          <ToggleGroupItem value="resource-day" aria-label="Day view">
            Day
          </ToggleGroupItem>
          <ToggleGroupItem value="resource-week" aria-label="Week view">
            Week
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
