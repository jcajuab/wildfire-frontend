import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";

interface GroupBadgeProps {
  readonly name: string;
}

export function GroupBadge({ name }: GroupBadgeProps): ReactElement {
  return (
    <Badge
      variant="secondary"
      className="max-w-full truncate border text-[11px] font-medium bg-blue-600 text-white border-blue-200"
    >
      {name}
    </Badge>
  );
}
