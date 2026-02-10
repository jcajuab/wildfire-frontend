"use client";

import { PaginationFooter } from "@/components/common/pagination-footer";

interface LogsPaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

export function LogsPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: LogsPaginationProps): React.ReactElement {
  return (
    <PaginationFooter
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      variant="numbered"
    />
  );
}
