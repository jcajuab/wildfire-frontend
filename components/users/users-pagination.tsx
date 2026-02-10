"use client";

import { PaginationFooter } from "@/components/common/pagination-footer";

interface UsersPaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

export function UsersPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: UsersPaginationProps): React.ReactElement {
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
