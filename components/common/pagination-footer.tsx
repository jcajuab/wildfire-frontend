"use client";

import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  readonly alwaysShow?: boolean;
  readonly className?: string;
}

export function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
  variant = "compact",
  alwaysShow = false,
  className,
}: PaginationFooterProps): ReactElement | null {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const boundedPage = Math.min(Math.max(page, 1), totalPages);
  const startItem = total === 0 ? 0 : (boundedPage - 1) * pageSize + 1;
  const endItem = Math.min(boundedPage * pageSize, total);
  const canGoPrevious = boundedPage > 1;
  const canGoNext = boundedPage < totalPages;

  if (!alwaysShow && (total <= pageSize || totalPages <= 1)) {
    return null;
  }

  const handleGo = (nextPage: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    onPageChange(nextPage);
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground sm:text-left">
        Showing {startItem} to {endItem} of {total} results
      </p>
      <Pagination className="mx-0 w-full justify-start sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canGoPrevious}
              tabIndex={canGoPrevious ? undefined : -1}
              className={!canGoPrevious ? "pointer-events-none opacity-50" : ""}
              onClick={handleGo(boundedPage - 1)}
            />
          </PaginationItem>
          {variant === "numbered" ? (
            getNumberedPageTokens(boundedPage, totalPages).map(
              (token, index) =>
                typeof token === "number" ? (
                  <PaginationItem key={token}>
                    <PaginationLink
                      href="#"
                      isActive={token === boundedPage}
                      onClick={handleGo(token)}
                    >
                      {token}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={`${token}-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ),
            )
          ) : (
            <PaginationItem>
              <PaginationLink href="#" isActive aria-current="page">
                {boundedPage}
              </PaginationLink>
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canGoNext}
              tabIndex={canGoNext ? undefined : -1}
              className={!canGoNext ? "pointer-events-none opacity-50" : ""}
              onClick={handleGo(boundedPage + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
