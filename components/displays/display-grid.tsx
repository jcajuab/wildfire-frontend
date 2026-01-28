"use client";

import { DisplayCard } from "./display-card";
import type { Display } from "@/types/display";

interface DisplayGridProps {
  readonly items: readonly Display[];
  readonly onViewDetails: (display: Display) => void;
  readonly onPreviewPage: (display: Display) => void;
  readonly onRefreshPage: (display: Display) => void;
  readonly onToggleDisplay: (display: Display) => void;
  readonly onRemoveDisplay: (display: Display) => void;
}

export function DisplayGrid({
  items,
  onViewDetails,
  onPreviewPage,
  onRefreshPage,
  onToggleDisplay,
  onRemoveDisplay,
}: DisplayGridProps): React.ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">No displays found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((display) => (
        <DisplayCard
          key={display.id}
          display={display}
          onViewDetails={onViewDetails}
          onPreviewPage={onPreviewPage}
          onRefreshPage={onRefreshPage}
          onToggleDisplay={onToggleDisplay}
          onRemoveDisplay={onRemoveDisplay}
        />
      ))}
    </div>
  );
}
