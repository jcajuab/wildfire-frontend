"use client";

import type { ReactElement } from "react";
import { IconSettings, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayGroup } from "@/lib/api/displays-api";

interface DisplayGroupCardProps {
  readonly group: DisplayGroup;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly onSettings: (e: React.MouseEvent) => void;
  readonly onDelete: (e: React.MouseEvent) => void;
  readonly canManage: boolean;
}

export function DisplayGroupCard({
  group,
  isSelected,
  onSelect,
  onSettings,
  onDelete,
  canManage,
}: DisplayGroupCardProps): ReactElement {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={isSelected}
      className={cn(
        "relative flex cursor-pointer items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors select-none",
        isSelected
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-background hover:bg-muted/50",
      )}
    >
      <span className="truncate font-medium">{group.name}</span>
      {canManage ? (
        <div className="ml-2 flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label={`Rename ${group.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onSettings(e);
            }}
          >
            <IconSettings className="size-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6 cursor-pointer text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${group.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
          >
            <IconTrash className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
