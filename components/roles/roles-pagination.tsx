"use client";

import { PaginationFooter } from "@/components/common/pagination-footer";

interface RolesPaginationProps {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly onPageChange: (page: number) => void;
}

export function RolesPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: RolesPaginationProps): React.ReactElement {
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
