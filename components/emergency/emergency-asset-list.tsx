"use client";

import type { ReactElement } from "react";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EmergencySlot,
  EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface EmergencyAssetListProps {
  readonly slots: readonly EmergencySlot[];
  readonly selectedSlotIndex: EmergencySlotIndex | null;
  readonly onSelectSlot: (slotIndex: EmergencySlotIndex) => void;
  readonly onClearSlot: (slotIndex: EmergencySlotIndex) => void;
  readonly clearingSlotIndex?: EmergencySlotIndex | null;
}

export function EmergencyAssetList({
  slots,
  selectedSlotIndex,
  onSelectSlot,
  onClearSlot,
  clearingSlotIndex = null,
}: EmergencyAssetListProps): ReactElement {
  const slotsByIndex = new Map<EmergencySlotIndex, EmergencySlot>();
  for (const slot of slots) {
    slotsByIndex.set(slot.slotIndex, slot);
  }

  return (
    <div className="flex flex-col gap-3">
      <header>
        <h3 className="text-sm font-medium">Emergency Slots</h3>
      </header>
      <ul className="flex flex-col gap-2">
        {SLOT_INDICES.map((slotIndex) => {
          const slot = slotsByIndex.get(slotIndex);
          const isFilled = slot != null && slot.contentId != null;
          const isSelected = selectedSlotIndex === slotIndex;

          const displayLabel = slot?.content?.title ?? `Slot ${slotIndex}`;
          const isClearingThis = clearingSlotIndex === slotIndex;

          if (isFilled && slot != null) {
            return (
              <li key={slotIndex}>
                <div
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border",
                  )}
                >
                  <button
                    type="button"
                    aria-label={`Select Slot ${slotIndex}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectSlot(slotIndex)}
                    className="min-w-0 flex-1 cursor-pointer text-left text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    title={displayLabel}
                  >
                    <span className="block truncate">{displayLabel}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Clear ${displayLabel}`}
                    onClick={() => onClearSlot(slotIndex)}
                    disabled={clearingSlotIndex !== null}
                    className="size-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {isClearingThis ? (
                      <IconLoader2
                        className="size-3.5 animate-spin text-current"
                        aria-hidden="true"
                      />
                    ) : (
                      <IconTrash
                        className="size-3.5 text-current"
                        aria-hidden="true"
                      />
                    )}
                  </Button>
                </div>
              </li>
            );
          }

          return (
            <li key={slotIndex}>
              <button
                type="button"
                aria-label={`Select Slot ${slotIndex}`}
                aria-pressed={isSelected}
                onClick={() => onSelectSlot(slotIndex)}
                className={cn(
                  "group flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                  "bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                    : "border-border hover:border-border",
                )}
              >
                <span className="text-xs font-medium text-inherit">
                  Slot {slotIndex}
                </span>
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:text-foreground",
                    isSelected && "text-primary group-hover:text-primary",
                  )}
                >
                  <IconPlus
                    className="size-3.5 text-current"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
