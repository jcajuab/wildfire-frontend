"use client";

import type { ReactElement } from "react";
import { IconPhoto, IconPencil } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGroupBadgeStyles } from "@/lib/display-group-colors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Display } from "@/types/display";

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
  if (!display) return null;
  const displayName = display.name.trim() || "Unnamed display";
  const location = display.location.trim() || "—";
  const ipAddress = display.ipAddress.trim() || "—";
  const macAddress = display.macAddress.trim() || "—";
  const output = display.output.trim() || "Not available";
  const resolution = display.resolution.trim() || "Not available";
  const emergencyContent = display.emergencyContentId ?? "None";

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
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <IconPhoto className="size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{displayName}</span>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {display.slug.trim() !== "" ? (
              <>
                <span className="text-muted-foreground">Slug:</span>
                <span className="font-mono text-xs">{display.slug}</span>
              </>
            ) : null}
            <span className="text-muted-foreground">Physical Location:</span>
            <span>{location}</span>

            <span className="text-muted-foreground">IP Address:</span>
            <span>{ipAddress}</span>

            <span className="text-muted-foreground">MAC Address:</span>
            <span>{macAddress}</span>

            <span className="text-muted-foreground">Display Output:</span>
            <span>{output}</span>

            <span className="text-muted-foreground">Resolution:</span>
            <span>{resolution}</span>

            <span className="text-muted-foreground">Emergency Asset:</span>
            <span className="font-mono text-xs">{emergencyContent}</span>

            <span className="text-muted-foreground">Display Groups:</span>
            <div className="flex flex-wrap gap-1">
              {display.groups.length > 0 ? (
                display.groups.map((group) => {
                  const styles = getGroupBadgeStyles(group.colorIndex ?? 0);
                  return (
                    <Badge
                      key={group.name}
                      variant="secondary"
                      className={`text-xs border ${styles.fill}`}
                    >
                      {group.name}
                    </Badge>
                  );
                })
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 sm:justify-between">
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
