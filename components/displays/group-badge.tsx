import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";

interface GroupBadgeProps {
  readonly name: string;
}

export function GroupBadge({ name }: GroupBadgeProps): ReactElement {
  return (
    <Badge
      variant="secondary"
      className="max-w-full truncate border border-primary/15 bg-primary/10 text-[11px] font-medium text-primary"
    >
      {name}
    </Badge>
  );
}
