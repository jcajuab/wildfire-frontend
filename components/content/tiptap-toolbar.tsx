"use client";

import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
  disabled?: boolean;
}

export function ToolbarButton({
  onClick,
  active,
  title,
  children,
  disabled,
}: ToolbarButtonProps): ReactElement {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn("size-8", active && "bg-muted")}
    >
      {children}
    </Button>
  );
}

export function ToolbarGroup({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 p-0.5">
      {children}
    </div>
  );
}

export function ToolbarDivider(): ReactElement {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-border" />;
}
