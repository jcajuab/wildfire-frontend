"use client";

import type { ReactElement } from "react";
import { IconPhoto } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { DisplayCard } from "./display-card";
import type { Display } from "@/types/display";

interface DisplayGridProps {
  readonly items: readonly Display[];
  readonly onViewDetails: (display: Display) => void;
  readonly onPreviewPage: (display: Display) => void;
  readonly onRefreshPage?: (display: Display) => void;
  readonly onEditDisplay?: (display: Display) => void;
}

export function DisplayGrid({
  items,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onEditDisplay,
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
          onPreviewPage={onPreviewPage}
          onRefreshPage={onRefreshPage}
          onEditDisplay={onEditDisplay}
        />
      ))}
    </div>
  );
}
