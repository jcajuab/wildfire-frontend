"use client";

import type { ComponentProps, ReactElement } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RequiredLabelProps = ComponentProps<typeof Label>;

export function RequiredLabel({
  children,
  className,
  ...props
}: RequiredLabelProps): ReactElement {
  return (
    <Label
      className={cn(
        "gap-0 after:text-destructive after:content-['*']",
        className,
      )}
      {...props}
    >
      {children}
    </Label>
  );
}
