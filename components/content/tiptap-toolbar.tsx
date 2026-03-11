"use client";

import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";

export interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
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
    >
      {children}
    </Button>
  );
}

export function ToolbarDivider(): ReactElement {
  return <div className="mx-1 h-6 w-px bg-border" />;
}
