"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { IconPencil, IconArrowRight } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Display } from "@/types/display";
import { useGetContentQuery } from "@/lib/api/content-api";

interface ViewDisplayDialogProps {
  readonly display: Display | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit: (display: Display) => void;
  readonly canEdit?: boolean;
}

export function ViewDisplayDialog({
  display,
  open,
  onOpenChange,
  onEdit,
  canEdit = true,
}: ViewDisplayDialogProps): ReactElement | null {
  const { data: emergencyContent, isLoading: isEmergencyLoading } =
    useGetContentQuery(display?.emergencyContentId ?? "", {
      skip: display?.emergencyContentId === null || display === null,
    });

  if (!display) return null;
  const displayName = display.name.trim() || "Unnamed display";
  const location = display.location.trim() || "—";
  const ipAddress = display.ipAddress.trim() || "—";
  const macAddress = display.macAddress.trim() || "—";
  const output = display.output.trim() || "Not available";
  const resolution = display.resolution.trim() || "Not available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>More Details</DialogTitle>
          <DialogDescription>
            View network, output, and group configuration details for this
            display.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span>{displayName}</span>

            {display.slug.trim() !== "" ? (
              <>
                <span className="text-muted-foreground">Slug</span>
                <span>{display.slug}</span>
              </>
            ) : null}
            <span className="text-muted-foreground">Physical Location</span>
            <span>{location}</span>

            <span className="text-muted-foreground">IP Address</span>
            <span>{ipAddress}</span>

            <span className="text-muted-foreground">MAC Address</span>
            <span>{macAddress}</span>

            <span className="text-muted-foreground">Display Output</span>
            <span>{output}</span>

            <span className="text-muted-foreground">Resolution</span>
            <span>{resolution}</span>

            <span className="text-muted-foreground">Emergency Asset</span>
            {display.emergencyContentId === null ? (
              <span>None</span>
            ) : isEmergencyLoading ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : (
              <Link
                href={`/admin/content?edit=${display.emergencyContentId}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                {emergencyContent?.title ?? display.emergencyContentId}
                <IconArrowRight className="size-3.5 shrink-0" />
              </Link>
            )}

            <span className="text-muted-foreground">Display Groups</span>
            <div className="flex flex-wrap gap-1">
              {display.groups.length > 0 ? (
                display.groups.map((group) => (
                  <Badge
                    key={group.name}
                    variant="secondary"
                    className="text-xs border bg-blue-600 text-white border-blue-200"
                  >
                    {group.name}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEdit && (
            <Button onClick={() => onEdit(display)}>
              <IconPencil className="size-4" />
              Edit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
