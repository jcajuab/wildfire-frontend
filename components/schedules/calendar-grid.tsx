"use client";

import type { ReactElement } from "react";
import { useMemo, useState, useCallback } from "react";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";

import { Can } from "@/components/common/can";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import type {
  CalendarView,
  ResourceMode,
  Schedule,
  ScheduleDisplay,
} from "@/types/schedule";
import type { DisplayGroup } from "@/lib/api/displays-api";
import {
  assignEventLanes,
  getDayDates,
  getWeekDates,
  groupEventsByResourceDate,
  projectResourceEvents,
} from "@/lib/schedules/resource-calendar";
import { ResourceWeekView, type CalendarRowItem } from "./resource-week-view";
import { ResourceDayView } from "./resource-day-view";

interface CalendarGridProps {
  readonly currentDate: Date;
  readonly view: CalendarView;
  readonly schedules: readonly Schedule[];
  readonly resources: readonly ScheduleDisplay[];
  readonly onScheduleClick: (schedule: Schedule) => void;
  readonly resourceMode: ResourceMode;
  readonly displayGroups: readonly DisplayGroup[];
}

function EmptyResourcesState(): ReactElement {
  return (
    <EmptyState
      title="No displays available for scheduling"
      description="Add displays first, then assign schedules to resources."
      action={
        <Can permission="displays:create">
          <Button asChild>
            <Link href="/admin/displays">
              <IconPlus className="size-4" aria-hidden="true" />
              Add Display
            </Link>
          </Button>
        </Can>
      }
    />
  );
}

export function CalendarGrid({
  currentDate,
  view,
  schedules,
  resources,
  onScheduleClick,
  resourceMode,
  displayGroups,
}: CalendarGridProps): ReactElement {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const handleGroupToggle = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const days = useMemo(() => {
    if (view === "resource-day") {
      return getDayDates(currentDate);
    }

    return getWeekDates(currentDate);
  }, [currentDate, view]);

  const flatRows = useMemo((): readonly CalendarRowItem[] => {
    if (resourceMode === "display") {
      return resources.map((r) => ({
        kind: "display" as const,
        id: r.id,
        rowKey: r.id,
        name: r.name,
      }));
    }

    const rows: CalendarRowItem[] = [];
    for (const group of displayGroups) {
      const isExpanded = expandedGroups.has(group.id);
      rows.push({
        kind: "group-header",
        id: group.id,
        name: group.name,
        colorIndex: group.colorIndex,
        expanded: isExpanded,
        displayCount: group.displayIds.length,
      });
      if (isExpanded) {
        const seenInGroup = new Set<string>();
        for (const displayId of group.displayIds) {
          if (seenInGroup.has(displayId)) continue;
          seenInGroup.add(displayId);
          const display = resources.find((r) => r.id === displayId);
          if (display) {
            rows.push({
              kind: "display",
              id: display.id,
              rowKey: `${group.id}:${display.id}`,
              name: display.name,
              inGroup: true,
            });
          }
        }
      }
    }
    return rows;
  }, [resourceMode, resources, displayGroups, expandedGroups]);

  const displayRows = useMemo(() => {
    return flatRows.filter(
      (r): r is Extract<CalendarRowItem, { kind: "display" }> =>
        r.kind === "display",
    );
  }, [flatRows]);

  const schedulesById = useMemo(() => {
    return new Map(schedules.map((schedule) => [schedule.id, schedule]));
  }, [schedules]);

  const projectedEvents = useMemo(() => {
    return projectResourceEvents({
      schedules,
      resources: displayRows,
      dates: days,
    });
  }, [schedules, displayRows, days]);

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
        resources={flatRows}
        eventsByResourceDate={eventsByResourceDate}
        schedulesById={schedulesById}
        onScheduleClick={onScheduleClick}
        onGroupToggle={handleGroupToggle}
      />
    );
  }

  return (
    <ResourceWeekView
      days={days}
      resources={flatRows}
      eventsByResourceDate={eventsByResourceDate}
      schedulesById={schedulesById}
      onScheduleClick={onScheduleClick}
      onGroupToggle={handleGroupToggle}
    />
  );
}
