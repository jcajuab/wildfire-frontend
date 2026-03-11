import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { getGroupBadgeStyles } from "@/lib/display-group-colors";

interface GroupBadgeProps {
  readonly name: string;
  readonly colorIndex: number;
}

export function GroupBadge({
  name,
  colorIndex,
}: GroupBadgeProps): ReactElement {
  const styles = getGroupBadgeStyles(colorIndex);
  return (
    <Badge
      variant="secondary"
      className={`max-w-full truncate border text-[11px] font-medium ${styles.fill}`}
    >
      {name}
    </Badge>
  );
}
