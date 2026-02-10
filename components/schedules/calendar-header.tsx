"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CalendarView } from "@/types/schedule";

interface CalendarHeaderProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onToday: () => void;
  readonly onMonthSelect: (month: number, year: number) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function generateYearOptions(currentYear: number): number[] {
  const years: number[] = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    years.push(i);
  }
  return years;
}

function formatDateRange(date: Date, view: CalendarView): string {
  const currentMonth = MONTHS[date.getMonth()];
  const currentYear = date.getFullYear();

  if (view === "month") {
    return `${currentMonth} ${currentYear}`;
  }

  if (view === "day") {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  if (view === "week") {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay()); // Sunday
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Saturday

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
    return `${startStr} - ${endStr}, ${currentYear}`;
  }

  return `${currentMonth} ${currentYear}`;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onMonthSelect,
}: CalendarHeaderProps): React.ReactElement {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const yearOptions = generateYearOptions(currentYear);
  const label = formatDateRange(currentDate, view);

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
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

      {/* Center: Month/Year Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-1 text-base font-medium">
            {label}
            <IconChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="center"
          className="max-h-64 overflow-y-auto"
        >
          {yearOptions.map((year) =>
            MONTHS.map((month, monthIndex) => (
              <DropdownMenuItem
                key={`${year}-${monthIndex}`}
                onClick={() => onMonthSelect(monthIndex, year)}
                className={
                  monthIndex === currentMonth && year === currentYear
                    ? "bg-primary/10"
                    : ""
                }
              >
                {month} {year}
              </DropdownMenuItem>
            )),
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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
        <ToggleGroupItem value="month">Month</ToggleGroupItem>
        <ToggleGroupItem value="week">Week</ToggleGroupItem>
        <ToggleGroupItem value="day">Day</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
