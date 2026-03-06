"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  IconCalendarEvent,
  IconCalendar,
  IconClock,
  IconPhoto,
  IconPencil,
  IconTrash,
  IconFlag,
  IconBolt,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatClockTime, formatDate } from "@/lib/formatters";
import type { Schedule } from "@/types/schedule";

interface ViewScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit?: (schedule: Schedule) => void;
  readonly onDelete?: (schedule: Schedule) => void;
}

export function ViewScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ViewScheduleDialogProps): ReactElement | null {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!schedule) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>View Details</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 rounded-md bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCalendarEvent className="size-4" />
                <span className="font-semibold">{schedule.name}</span>
              </div>
              <Badge variant={schedule.isActive ? "default" : "secondary"}>
                {schedule.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <IconCalendar className="size-4" />
              <span>
                {formatDate(schedule.startDate)} -{" "}
                {formatDate(schedule.endDate)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <IconClock className="size-4" />
              <span>
                {formatClockTime(schedule.startTime)} -{" "}
                {formatClockTime(schedule.endTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <IconFlag className="size-4" />
              <span>Priority: {schedule.priority}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mode:</span>
              <span className="text-foreground">
                {schedule.kind === "PLAYLIST"
                  ? "Base playlist"
                  : "Flash overlay"}
              </span>
            </div>

            {schedule.playlist ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Playlist:</span>
                <span className="text-foreground">
                  {schedule.playlist.name}
                </span>
              </div>
            ) : null}

            {schedule.content ? (
              <div className="space-y-2 rounded-md border border-border bg-background/70 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <IconBolt className="size-4" />
                  {schedule.content.title}
                </div>
                {schedule.content.flashMessage ? (
                  <p className="text-muted-foreground">
                    {schedule.content.flashMessage}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Display:</span>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="gap-1">
                  <IconPhoto className="size-3" />
                  {schedule.targetDisplay.name}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between pt-4 sm:justify-between">
            {onDelete ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <IconTrash className="size-4" />
                Delete
              </Button>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {onEdit ? (
                <Button onClick={() => onEdit(schedule)}>
                  <IconPencil className="size-4" />
                  Edit
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete schedule?</DialogTitle>
            <DialogDescription>
              This action removes the schedule from the calendar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:justify-start">
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(schedule);
                setConfirmDeleteOpen(false);
                onOpenChange(false);
              }}
            >
              Delete schedule
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
