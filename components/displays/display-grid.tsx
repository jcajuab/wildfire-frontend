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
  readonly onRemoveDisplay: (display: Display) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
}

export function DisplayGrid({
  items,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onToggleDisplay,
  onRemoveDisplay,
  canUpdate = true,
  canDelete = true,
}: DisplayGridProps): ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No displays found"
        description="Displays register themselves via the API. Use Add Display to see registration instructions, or ensure your devices have called POST /devices with the device API key."
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
          onRemoveDisplay={onRemoveDisplay}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
