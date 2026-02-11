"use client";

import type { ReactElement } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

type PaginationVariant = "compact" | "numbered";

interface PaginationFooterProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
  readonly variant?: PaginationVariant;
}

export function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  variant = "compact",
}: PaginationFooterProps): ReactElement {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  if (total === 0) {
    return <div className="border-t px-6 py-3" />;
  }

  return (
    <div className="flex items-center justify-between border-t px-6 py-3">
      <p className="text-sm text-muted-foreground">
        Showing {startItem} to {endItem} of {total} results
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
          aria-label="Previous page"
        >
          <IconChevronLeft className="size-4" />
        </Button>
        {variant === "numbered" ? (
          Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <Button
                key={pageNumber}
                variant={pageNumber === page ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => onPageChange(pageNumber)}
                aria-label={`Go to page ${pageNumber}`}
              >
                {pageNumber}
              </Button>
            ),
          )
        ) : (
          <div className="flex h-6 min-w-6 items-center justify-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground">
            {page}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          aria-label="Next page"
        >
          <IconChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
