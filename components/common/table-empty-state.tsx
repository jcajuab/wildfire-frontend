import type { ReactElement, ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableEmptyStateProps {
  readonly colSpan: number;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
}

export function TableEmptyState({
  colSpan,
  title,
  description,
  icon,
  action,
}: TableEmptyStateProps): ReactElement {
  return (
    <TableRow className="border-0 hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-64 whitespace-normal p-0">
        <div className="flex min-h-64 w-full items-center justify-center px-6 py-10">
          <EmptyState
            title={title}
            description={description}
            icon={icon}
            action={action}
            className="max-w-none border-0 bg-transparent shadow-none"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
