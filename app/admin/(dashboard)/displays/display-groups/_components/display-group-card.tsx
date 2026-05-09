"use client";

import type { ReactElement } from "react";
import { IconSettings } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayGroup } from "@/lib/api/displays-api";

interface DisplayGroupCardProps {
  readonly group: DisplayGroup;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
  readonly onSettings: (e: React.MouseEvent) => void;
  readonly canManage: boolean;
}

export function DisplayGroupCard({
  group,
  isSelected,
  onSelect,
  onSettings,
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
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-2 size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground"
          aria-label="Group settings"
          onClick={(e) => {
            e.stopPropagation();
            onSettings(e);
          }}
        >
          <IconSettings className="size-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}
