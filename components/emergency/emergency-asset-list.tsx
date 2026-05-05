"use client";

import type { ReactElement } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";

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
  readonly isClearing?: boolean;
}

export function EmergencyAssetList({
  slots,
  selectedSlotIndex,
  onSelectEmptySlot,
  onClearSlot,
  isClearing = false,
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
            const label = slot.label ?? slot.content?.title ?? `Slot ${slotIndex}`;
            return (
              <li key={slotIndex}>
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                  <span className="truncate text-xs font-medium">{label}</span>
                  <button
                    type="button"
                    aria-label={`Clear ${label}`}
                    onClick={() => onClearSlot(slotIndex)}
                    disabled={isClearing}
                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <IconX className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={slotIndex}>
              <button
                type="button"
                aria-label={`Select empty Slot ${slotIndex}`}
                aria-pressed={isSelected}
                onClick={() => onSelectEmptySlot(slotIndex)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span className="text-xs">Slot {slotIndex}</span>
                <IconPlus className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
