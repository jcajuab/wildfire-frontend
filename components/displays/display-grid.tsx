"use client";

import type { ReactElement } from "react";
import { IconDeviceTv } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { DisplayCard } from "./display-card";
import type { Display } from "@/types/display";

interface DisplayGridProps {
  readonly items: readonly Display[];
  readonly onViewDetails: (display: Display) => void;
  readonly onPreviewPage: (display: Display) => void;
  readonly onRefreshPage: (display: Display) => void;
  readonly onToggleDisplay: (display: Display) => void;
  readonly canUpdate?: boolean;
}

export function DisplayGrid({
  items,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onToggleDisplay,
  canUpdate = true,
}: DisplayGridProps): ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No displays found"
        description="Displays register themselves automatically. Use Add Display to see registration instructions for your Raspberry Pi displays."
        icon={<IconDeviceTv className="size-7" aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((display) => (
        <DisplayCard
          key={display.id}
          display={display}
          onViewDetails={onViewDetails}
          onPreviewPage={onPreviewPage}
          onRefreshPage={onRefreshPage}
          onToggleDisplay={onToggleDisplay}
          canUpdate={canUpdate}
        />
      ))}
    </div>
  );
}
