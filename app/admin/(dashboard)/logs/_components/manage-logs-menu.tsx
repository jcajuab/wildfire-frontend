"use client";

import type { ReactElement } from "react";
import {
  IconChevronDown,
  IconFileExport,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ManageLogsMenuProps {
  readonly canExport: boolean;
  readonly canFlush: boolean;
  readonly onExport: () => void;
  readonly onFlush: () => void;
}

export function ManageLogsMenu({
  canExport,
  canFlush,
  onExport,
  onFlush,
}: ManageLogsMenuProps): ReactElement | null {
  if (!canExport && !canFlush) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <IconSettings
            className="size-4"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Manage Logs
          <IconChevronDown
            className="size-4"
            aria-hidden="true"
            data-icon="inline-end"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {canExport ? (
          <DropdownMenuItem onSelect={onExport}>
            <IconFileExport className="size-4" aria-hidden="true" />
            Export Logs
          </DropdownMenuItem>
        ) : null}
        {canExport && canFlush ? <DropdownMenuSeparator /> : null}
        {canFlush ? (
          <DropdownMenuItem variant="destructive" onSelect={onFlush}>
            <IconTrash className="size-4" aria-hidden="true" />
            Flush Logs
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
