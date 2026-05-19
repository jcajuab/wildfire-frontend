"use client";

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconPencil, IconTrash } from "@tabler/icons-react";

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
import {
  formatScheduleCreator,
  formatSchedulePostedAt,
  formatScheduleValidityDuration,
  formatScheduleVisibleFrom,
  formatScheduleVisibleUntil,
} from "@/lib/schedules/schedule-display";
import { getPlaylistEditPath, getPlaylistViewPath } from "@/lib/playlist-paths";
import type { Schedule, ScheduleContent } from "@/types/schedule";

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

function DetailRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </>
  );
}

function DetailGroup({
  children,
  separated = false,
}: {
  readonly children: ReactNode;
  readonly separated?: boolean;
}): ReactElement {
  return (
    <dl
      className={`grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm ${
        separated ? "border-t border-border pt-3" : ""
      }`}
    >
      {children}
    </dl>
  );
}

function DetailLink({
  href,
  onClick,
  children,
}: {
  readonly href: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex max-w-full min-w-0 items-start gap-1 text-primary hover:underline"
    >
      <span className="min-w-0 break-words">{children}</span>
      <IconArrowRight className="mt-0.5 size-3.5 shrink-0" />
    </Link>
  );
}

function getFlashToneLabel(tone: ScheduleContent["flashTone"]): string {
  if (tone === "CRITICAL") return "Critical";
  if (tone === "WARNING") return "Warning";
  if (tone === "INFO") return "Info";
  return "Not set";
}

function displaySearchPath(displayName: string): string {
  return `/admin/displays?q=${encodeURIComponent(displayName)}`;
}

function getScheduleDialogTitle(schedule: Schedule): string {
  return schedule.kind === "FLASH"
    ? "Flash Schedule Details"
    : "Playlist Schedule Details";
}

export function ViewScheduleDialog({
  schedule,
  open,
  onOpenChange,
  canOpenPlaylistLink = false,
  onEdit,
  onDelete,
}: ViewScheduleDialogProps): ReactElement | null {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  if (!schedule) return null;
  const playlistPath = schedule.playlist
    ? canOpenPlaylistLink
      ? getPlaylistEditPath(schedule.playlist.id)
      : getPlaylistViewPath(schedule.playlist.id)
    : null;
  const dialogTitle = getScheduleDialogTitle(schedule);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Review the timing, content, and display assignment for this
              scheduled item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <DetailGroup>
              <DetailRow label="Title">{schedule.name}</DetailRow>

              {schedule.playlist ? (
                <DetailRow label="Playlist">
                  <DetailLink
                    href={
                      playlistPath ?? getPlaylistViewPath(schedule.playlist.id)
                    }
                    onClick={() => onOpenChange(false)}
                  >
                    {schedule.playlist.name}
                  </DetailLink>
                </DetailRow>
              ) : null}

              {schedule.content ? (
                <>
                  <DetailRow label="Tone">
                    {getFlashToneLabel(schedule.content.flashTone)}
                  </DetailRow>

                  <DetailRow label="Message">
                    <span className="block whitespace-pre-wrap break-words leading-relaxed">
                      {schedule.content.flashMessage ?? "No message content."}
                    </span>
                  </DetailRow>
                </>
              ) : null}

              <DetailRow label="Target display">
                <DetailLink
                  href={displaySearchPath(schedule.display.name)}
                  onClick={() => onOpenChange(false)}
                >
                  {schedule.display.name}
                </DetailLink>
              </DetailRow>
            </DetailGroup>

            <DetailGroup separated>
              <DetailRow label="Visible from">
                {formatScheduleVisibleFrom(schedule)}
              </DetailRow>
              <DetailRow label="Visible until">
                {formatScheduleVisibleUntil(schedule)}
              </DetailRow>
              <DetailRow label="Duration">
                {formatScheduleValidityDuration(schedule)}
              </DetailRow>
            </DetailGroup>

            <DetailGroup separated>
              <DetailRow label="Author">
                {formatScheduleCreator(schedule)}
              </DetailRow>
              <DetailRow label="Posted">
                {formatSchedulePostedAt(schedule)}
              </DetailRow>
            </DetailGroup>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex min-h-7 items-center"
              data-slot="dialog-footer-destructive-actions"
            >
              {onDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <IconTrash
                    className="size-4"
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Delete
                </Button>
              ) : null}
            </div>
            <div
              className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
              data-slot="dialog-footer-primary-actions"
            >
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {onEdit ? (
                <Button onClick={() => onEdit(schedule)}>
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
