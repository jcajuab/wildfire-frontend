"use client";

import type { ComponentProps, ReactElement } from "react";

import { cn } from "@/lib/utils";

export function TableHeaderControl({
  className,
  ...props
}: ComponentProps<"button">): ReactElement {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-sm px-1 text-xs font-medium text-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
