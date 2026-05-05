"use client";

import type { ReactElement } from "react";
import { useEffect } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function DashboardError({
  error,
  reset,
}: DashboardErrorProps): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-8 sm:px-8">
      <EmptyState
        title="Something went wrong"
        description="We couldn't load this admin page. Try again in a moment."
        action={
          <Button type="button" onClick={reset}>
            Retry
          </Button>
        }
      />
    </div>
  );
}
