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
  readonly onPrevMonth: () => void;
  readonly onNextMonth: () => void;
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

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrevMonth,
  onNextMonth,
  onToday,
  onMonthSelect,
}: CalendarHeaderProps): React.ReactElement {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthName = MONTHS[currentMonth];
  const yearOptions = generateYearOptions(currentYear);

  return (
    <div className="flex items-center justify-between gap-4 pb-4">
      {/* Left: Today + Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="outline" size="icon-sm" onClick={onPrevMonth}>
          <IconChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={onNextMonth}>
          <IconChevronRight className="size-4" />
        </Button>
      </div>

      {/* Center: Month/Year Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-1 text-base font-medium">
            {monthName} {currentYear}
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
