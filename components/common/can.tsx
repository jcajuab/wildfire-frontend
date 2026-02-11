"use client";

import type { ReactElement, ReactNode } from "react";
import { useCan } from "@/hooks/use-can";

interface CanProps {
  readonly permission: string;
  readonly children: ReactNode;
}

/**
 * Renders children only when the current user has the given permission.
 */
export function Can({ permission, children }: CanProps): ReactElement | null {
  const allowed = useCan(permission);
  if (!allowed) return null;
  return <>{children}</>;
}
