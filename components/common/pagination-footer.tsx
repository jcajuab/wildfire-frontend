"use client";

import type { ReactElement } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

type PaginationVariant = "compact" | "numbered";
type PaginationToken = number | "start-ellipsis" | "end-ellipsis";

function getNumberedPageTokens(
  currentPage: number,
  totalPages: number,
): readonly PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    totalPages,
  ];
}

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
}: PaginationFooterProps): ReactElement | null {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const numberedPageTokens = getNumberedPageTokens(page, totalPages);

  if (total <= pageSize || totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground sm:text-left">
        Showing {startItem} to {endItem} of {total} results
      </p>
      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:flex-nowrap">
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
          numberedPageTokens.map((token, index) =>
            typeof token === "number" ? (
              <Button
                key={token}
                variant={token === page ? "default" : "ghost"}
                size="icon-sm"
                onClick={() => onPageChange(token)}
                aria-label={`Go to page ${token}`}
                aria-current={token === page ? "page" : undefined}
              >
                {token}
              </Button>
            ) : (
              <span
                key={`${token}-${index}`}
                className="text-muted-foreground inline-flex size-6 items-center justify-center text-xs"
                aria-hidden="true"
              >
                …
              </span>
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
