import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageToolbarProps {
  /** Left-aligned slot — typically a calendar nav, status pill, or section heading. */
  readonly start?: ReactNode;
  /** Right-aligned controls — typically a Filter popover and/or SearchControl. */
  readonly end?: ReactNode;
  readonly className?: string;
}

/**
 * Consistent strip directly under <PageHeader> for filter / search / contextual nav.
 * One layout, every admin list page. Hidden when both slots are empty.
 */
export function PageToolbar({
  start,
  end,
  className,
}: PageToolbarProps): ReactElement | null {
  if (!start && !end) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-border bg-muted/15 px-6 py-2 sm:px-8",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col gap-2 sm:flex-row sm:items-center",
          start ? "sm:justify-between" : "sm:justify-end",
        )}
      >
        {start ? (
          <div className="flex flex-wrap items-center gap-2">{start}</div>
        ) : null}
        {end ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {end}
          </div>
        ) : null}
      </div>
    </div>
  );
}
