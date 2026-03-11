"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import type { CalendarView, Schedule, ScheduleDisplay } from "@/types/schedule";
import {
  assignEventLanes,
  getDayDates,
  getWeekDates,
  groupEventsByResourceDate,
  projectResourceEvents,
} from "@/lib/schedules/resource-calendar";
import { ResourceWeekView } from "./resource-week-view";
import { ResourceDayView } from "./resource-day-view";

interface CalendarGridProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly schedules: readonly Schedule[];
  readonly resources: readonly ScheduleDisplay[];
  readonly onScheduleClick: (schedule: Schedule) => void;
}

function EmptyResourcesState(): ReactElement {
  return (
    <EmptyState
      title="No displays available for scheduling"
      description="Add displays first, then assign schedules to resources."
      icon={<IconPhoto className="size-7" aria-hidden="true" />}
    />
  );
}

export function CalendarGrid({
  currentDate,
  view,
  schedules,
  resources,
  onScheduleClick,
}: CalendarGridProps): ReactElement {
  const days = useMemo(() => {
    if (view === "resource-day") {
      return getDayDates(currentDate);
    }

    return getWeekDates(currentDate);
  }, [currentDate, view]);

  const schedulesById = useMemo(() => {
    return new Map(schedules.map((schedule) => [schedule.id, schedule]));
  }, [schedules]);

  const projectedEvents = useMemo(() => {
    return projectResourceEvents({
      schedules,
      resources,
      dates: days,
    });
  }, [schedules, resources, days]);

  const laidOutEvents = useMemo(() => {
    return assignEventLanes(projectedEvents);
  }, [projectedEvents]);

  const eventsByResourceDate = useMemo(() => {
    return groupEventsByResourceDate(laidOutEvents);
  }, [laidOutEvents]);

  if (resources.length === 0) {
    return <EmptyResourcesState />;
  }

  if (view === "resource-day") {
    return (
      <ResourceDayView
        days={days}
        resources={resources}
        eventsByResourceDate={eventsByResourceDate}
        schedulesById={schedulesById}
        onScheduleClick={onScheduleClick}
      />
    );
  }

  return (
    <ResourceWeekView
      days={days}
      resources={resources}
      eventsByResourceDate={eventsByResourceDate}
      schedulesById={schedulesById}
      onScheduleClick={onScheduleClick}
    />
  );
}
