"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  IconCalendarEvent,
  IconCalendar,
  IconClock,
  IconRepeat,
  IconDeviceDesktop,
  IconPencil,
  IconX,
  IconTrash,
  IconFlag,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import type { Schedule } from "@/types/schedule";

interface ViewScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit: (schedule: Schedule) => void;
  readonly onDelete: (schedule: Schedule) => void;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function formatRecurrence(recurrence: string): string {
  switch (recurrence) {
    case "DAILY":
      return "Daily";
    case "WEEKLY":
      return "Weekly";
    case "MONTHLY":
      return "Monthly";
    default:
      return "None";
  }
}

export function ViewScheduleDialog({
  schedule,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: ViewScheduleDialogProps): ReactElement | null {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!schedule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 rounded-lg border-2 border-dashed border-primary/30 p-4">
          {/* Schedule Name */}
          <div className="flex items-center gap-2">
            <IconCalendarEvent className="size-4" />
            <span className="font-semibold">{schedule.name}</span>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 text-sm">
            <IconCalendar className="size-4" />
            <span>
              {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
            </span>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2 text-sm">
            <IconClock className="size-4" />
            <span>
              {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
            </span>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-2 text-sm">
            <IconRepeat className="size-4" />
            <span>{formatRecurrence(schedule.recurrence)}</span>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2 text-sm">
            <IconFlag className="size-4" />
            <span>Priority: {schedule.priority}</span>
          </div>

          {/* Playlist */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Playlist:</span>
            <span className="flex items-center gap-1 text-foreground">
              {schedule.playlist.name}
            </span>
          </div>

          {/* Target Displays */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target Displays:</span>
            <div className="flex flex-wrap gap-1">
              {schedule.targetDisplays.map((display) => (
                <Badge key={display.id} variant="outline" className="gap-1">
                  <IconDeviceDesktop className="size-3" />
                  {display.name}
                  <IconX className="size-3" />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-t-2 border-dashed border-primary/30 pt-4 sm:justify-between">
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <IconTrash className="size-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canEdit && (
              <Button onClick={() => onEdit(schedule)}>
                <IconPencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete schedule?"
        description={`This will permanently delete "${schedule.name}".`}
        confirmLabel="Delete schedule"
        onConfirm={() => {
          onDelete(schedule);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
