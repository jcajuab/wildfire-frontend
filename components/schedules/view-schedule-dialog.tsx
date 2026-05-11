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
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { formatClockTime, formatDate } from "@/lib/formatters";
import type { Schedule } from "@/types/schedule";

interface ViewScheduleDialogProps {
  readonly schedule: Schedule | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly canViewAssignmentDetails?: boolean;
  readonly canOpenPlaylistLink?: boolean;
  readonly canOpenContentLink?: boolean;
  readonly canOpenDisplayLink?: boolean;
  readonly onEdit?: (schedule: Schedule) => void;
  readonly onDelete?: (schedule: Schedule) => void;
}

export function ViewScheduleDialog({
  schedule,
  open,
  onOpenChange,
  canViewAssignmentDetails = true,
  canOpenPlaylistLink = false,
  canOpenContentLink = false,
  canOpenDisplayLink = false,
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
            <DialogTitle>Schedule Details</DialogTitle>
            <DialogDescription>
              Review the timing, content, and display assignment for this
              scheduled item.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
              <span className="text-muted-foreground">Title</span>
              <span>{schedule.name}</span>

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

              {canViewAssignmentDetails ? (
                <>
                  <span className="text-muted-foreground">Mode</span>
                  <span>
                    {schedule.kind === "PLAYLIST" ? "Base playlist" : "Flash"}
                  </span>

                  {schedule.playlist ? (
                    <>
                      <span className="text-muted-foreground">Playlist</span>
                      {canOpenPlaylistLink ? (
                        <Link
                          href={`/admin/playlists/edit/${schedule.playlist.id}`}
                          onClick={() => onOpenChange(false)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {schedule.playlist.name}
                          <IconArrowRight className="size-3.5 shrink-0" />
                        </Link>
                      ) : (
                        <span>{schedule.playlist.name}</span>
                      )}
                    </>
                  ) : null}

                  {schedule.content ? (
                    <>
                      <span className="text-muted-foreground">Content</span>
                      {canOpenContentLink ? (
                        <Link
                          href={`/admin/content?edit=${schedule.content.id}`}
                          onClick={() => onOpenChange(false)}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          {schedule.content.title}
                          <IconArrowRight className="size-3.5 shrink-0" />
                        </Link>
                      ) : (
                        <span>{schedule.content.title}</span>
                      )}
                    </>
                  ) : null}

                  <span className="text-muted-foreground">Target display</span>
                  {canOpenDisplayLink ? (
                    <Link
                      href={`/admin/displays?selectedDisplay=${schedule.display.id}`}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      {schedule.display.name}
                      <IconArrowRight className="size-3.5 shrink-0" />
                    </Link>
                  ) : (
                    <span>{schedule.display.name}</span>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {onDelete ? (
              <div className="flex sm:flex-1">
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <IconTrash
                    className="size-4"
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Delete
                </Button>
              </div>
            ) : null}
            <div className="flex w-full justify-end gap-2 sm:w-auto sm:flex-1">
              <Button
                variant="outline"
                className={onEdit ? "flex-1 sm:flex-none" : "w-full sm:w-auto"}
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              {onEdit ? (
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() => onEdit(schedule)}
                >
                  <IconPencil
                    className="size-4"
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Edit
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete schedule?"
        description="This action removes the schedule from the calendar."
        confirmLabel="Delete schedule"
        onConfirm={() => {
          onDelete?.(schedule);
          onOpenChange(false);
        }}
      />
    </>
  );
}
