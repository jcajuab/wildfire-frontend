"use client";

import type { ReactElement } from "react";
import { IconFilter } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  CalendarView,
  DisplayGroupSortField,
  ResourceMode,
} from "@/types/schedule";

interface ScheduleFilterPopoverProps {
  readonly resourceMode: ResourceMode;
  readonly onResourceModeChange: (mode: ResourceMode) => void;
  readonly view: CalendarView;
  readonly onViewChange: (view: CalendarView) => void;
  readonly displayGroupSort: DisplayGroupSortField;
  readonly onDisplayGroupSortChange: (sort: DisplayGroupSortField) => void;
}

export function ScheduleFilterPopover({
  resourceMode,
  onResourceModeChange,
  view,
  onViewChange,
  displayGroupSort,
  onDisplayGroupSortChange,
}: ScheduleFilterPopoverProps): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant='outline' size='default' className='gap-2'>
          <IconFilter className='size-4' aria-hidden='true' />
          <span>Filter</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-56 p-4'
        side='bottom'
        align='end'
        avoidCollisions={false}
      >
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              By Group
            </Label>
            <ToggleGroup
              type='single'
              value={resourceMode}
              onValueChange={(value) => {
                if (value) {
                  onResourceModeChange(value as ResourceMode);
                }
              }}
              variant='outline'
              className='w-full'
            >
              <ToggleGroupItem value='display' className='flex-1'>
                Display
              </ToggleGroupItem>
              <ToggleGroupItem value='display-group' className='flex-1'>
                Display Group
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {resourceMode === "display-group" && (
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Sort Groups
              </Label>
              <ToggleGroup
                type='single'
                value={displayGroupSort}
                onValueChange={(value) => {
                  if (value)
                    onDisplayGroupSortChange(value as DisplayGroupSortField);
                }}
                variant='outline'
                className='w-full'
              >
                <ToggleGroupItem value='alphabetical' className='flex-1'>
                  A–Z
                </ToggleGroupItem>
                <ToggleGroupItem value='display-count' className='flex-1'>
                  Display Count
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              By Time
            </Label>
            <ToggleGroup
              type='single'
              value={view}
              onValueChange={(value) => {
                if (value) {
                  onViewChange(value as CalendarView);
                }
              }}
              variant='outline'
              className='w-full'
            >
              <ToggleGroupItem value='resource-week' className='flex-1'>
                Week
              </ToggleGroupItem>
              <ToggleGroupItem value='resource-day' className='flex-1'>
                Day
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
