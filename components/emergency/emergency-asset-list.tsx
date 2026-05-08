"use client";

import type { ReactElement } from "react";
import { IconLoader2, IconPlus, IconX } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import type {
  EmergencySlot,
  EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface EmergencyAssetListProps {
  readonly slots: readonly EmergencySlot[];
  readonly selectedSlotIndex: EmergencySlotIndex | null;
  readonly onSelectEmptySlot: (slotIndex: EmergencySlotIndex) => void;
  readonly onClearSlot: (slotIndex: EmergencySlotIndex) => void;
  readonly clearingSlotIndex?: EmergencySlotIndex | null;
}

export function EmergencyAssetList({
  slots,
  selectedSlotIndex,
  onSelectEmptySlot,
  onClearSlot,
  clearingSlotIndex = null,
}: EmergencyAssetListProps): ReactElement {
  const slotsByIndex = new Map<EmergencySlotIndex, EmergencySlot>();
  for (const slot of slots) {
    slotsByIndex.set(slot.slotIndex, slot);
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Assets</h3>
        <p className="text-xs text-muted-foreground">
          Choose up to five emergency assets.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {SLOT_INDICES.map((slotIndex) => {
          const slot = slotsByIndex.get(slotIndex);
          const isFilled = slot != null && slot.contentId != null;
          const isSelected = selectedSlotIndex === slotIndex;

          if (isFilled && slot != null) {
            const label =
              slot.label ?? slot.content?.title ?? `Slot ${slotIndex}`;
            const isClearingThis = clearingSlotIndex === slotIndex;
            return (
              <li key={slotIndex}>
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <span className="truncate text-xs font-medium">{label}</span>
                  <button
                    type="button"
                    aria-label={`Clear ${label}`}
                    onClick={() => onClearSlot(slotIndex)}
                    disabled={clearingSlotIndex !== null}
                    className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isClearingThis ? (
                      <IconLoader2
                        className="size-3.5 animate-spin text-current"
                        aria-hidden="true"
                      />
                    ) : (
                      <IconX
                        className="size-3.5 text-current"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={slotIndex}>
              <button
                type="button"
                aria-label={`Select or clear selection for empty Slot ${slotIndex}`}
                aria-pressed={isSelected}
                onClick={() => onSelectEmptySlot(slotIndex)}
                className={cn(
                  "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-md border-2 border-dashed px-3 py-2.5 text-left transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary hover:text-foreground"
                    : "border-border/90 hover:border-primary/60",
                )}
              >
                <span className="text-xs text-inherit">Slot {slotIndex}</span>
                <span
                  className={cn(
                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors text-muted-foreground group-hover:text-foreground",
                    isSelected && "text-primary group-hover:text-foreground",
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
