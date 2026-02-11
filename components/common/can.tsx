"use client";

import { useCan } from "@/hooks/use-can";

interface CanProps {
  readonly permission: string;
  readonly children: React.ReactNode;
}

/**
 * Renders children only when the current user has the given permission.
 */
export function Can({ permission, children }: CanProps): React.ReactElement | null {
  const allowed = useCan(permission);
  if (!allowed) return null;
  return <>{children}</>;
}
