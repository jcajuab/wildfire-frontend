"use client";

import type { ReactElement } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { DisplayCard } from "./display-card";
import type { Display } from "@/types/display";

interface DisplayGridProps {
  readonly items: readonly Display[];
  readonly onViewDetails: (display: Display) => void;
  readonly onViewPage: (display: Display) => void;
  readonly onUnregisterDisplay?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
  readonly isGlobalEmergencyActive?: boolean;
}

export function DisplayGrid({
  items,
  onViewDetails,
  onViewPage,
  onUnregisterDisplay,
  onEditDisplay,
  isGlobalEmergencyActive = false,
}: DisplayGridProps): ReactElement {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No displays found"
        description="Displays register themselves automatically. Use Add Display to see registration instructions for your Raspberry Pi displays."
        icon={<IconPhoto className="size-7" aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {items.map((display) => (
        <DisplayCard
          key={display.id}
          display={display}
          onViewDetails={onViewDetails}
          onViewPage={onViewPage}
          onUnregisterDisplay={onUnregisterDisplay}
          onEditDisplay={onEditDisplay}
          isGlobalEmergencyActive={isGlobalEmergencyActive}
        />
      ))}
    </div>
  );
}
