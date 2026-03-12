"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { IconPencil, IconTrash, IconArrowRight } from "@tabler/icons-react";


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
            <DialogDescription>
              Review the timing, content, and display assignment for this
              scheduled item.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Title</span>
              <span>{schedule.name}</span>

              <span className="text-muted-foreground">Status</span>
              <span>
                <Badge variant={schedule.isActive ? "default" : "secondary"}>
                  {schedule.isActive ? "Active" : "Inactive"}
                </Badge>
              </span>

              <span className="text-muted-foreground">Scheduled for</span>
              <span>
                {formatDate(schedule.startDate)} –{" "}
                {formatDate(schedule.endDate)}
              </span>

              <span className="text-muted-foreground">Time</span>
              <span>
                {formatClockTime(schedule.startTime)} –{" "}
                {formatClockTime(schedule.endTime)}
              </span>

              <span className="text-muted-foreground">Mode</span>
              <span>
                {schedule.kind === "PLAYLIST"
                  ? "Base playlist"
                  : "Flash overlay"}
              </span>

              {schedule.playlist ? (
                <>
                  <span className="text-muted-foreground">Playlist</span>
                  <Link
                    href={`/admin/playlists?manage=${schedule.playlist.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {schedule.playlist.name}
                    <IconArrowRight className="size-3.5 shrink-0" />
                  </Link>
                </>
              ) : null}

              {schedule.content ? (
                <>
                  <span className="text-muted-foreground">Content</span>
                  <Link
                    href={`/admin/content?edit=${schedule.content.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {schedule.content.title}
                    <IconArrowRight className="size-3.5 shrink-0" />
                  </Link>
                </>
              ) : null}

              <span className="text-muted-foreground">Target display</span>
              <span>{schedule.targetDisplay.name}</span>
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
