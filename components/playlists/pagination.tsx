"use client";

import type { ReactElement } from "react";
import { PaginationFooter } from "@/components/common/pagination-footer";

interface PaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps): ReactElement {
  return (
    <PaginationFooter
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      variant="compact"
    />
  );
}
