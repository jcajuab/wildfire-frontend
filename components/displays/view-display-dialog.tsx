"use client";

import type { ReactElement } from "react";
import { IconPhoto, IconMapPin, IconPencil } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Details</DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <IconPhoto className="size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{display.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <IconMapPin className="size-4" />
                {display.location}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {display.identifier != null && display.identifier !== "" ? (
              <>
                <span className="text-muted-foreground">Identifier:</span>
                <span className="font-mono text-xs">{display.identifier}</span>
              </>
            ) : null}
            <span className="text-muted-foreground">IP Address:</span>
            <span>{display.ipAddress || "—"}</span>

            <span className="text-muted-foreground">MAC Address:</span>
            <span>{display.macAddress || "—"}</span>

            <span className="text-muted-foreground">Display Output:</span>
            <span>{display.displayOutput}</span>

            <span className="text-muted-foreground">Resolution:</span>
            <span>{display.resolution}</span>

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
