"use client";

import type { ReactElement } from "react";
import { IconLoader2, IconPlus, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  EmergencySlot,
  EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface EmergencyAssetListProps {
  readonly slots: readonly EmergencySlot[];
  readonly selectedSlotIndex: EmergencySlotIndex | null;
  readonly slotLabel: string;
  readonly canSaveSlotLabel: boolean;
  readonly isSavingSlotLabel?: boolean;
  readonly onSelectSlot: (slotIndex: EmergencySlotIndex) => void;
  readonly onSlotLabelChange: (value: string) => void;
  readonly onSaveSlotLabel: () => void;
  readonly onClearSlot: (slotIndex: EmergencySlotIndex) => void;
  readonly clearingSlotIndex?: EmergencySlotIndex | null;
}

export function EmergencyAssetList({
  slots,
  selectedSlotIndex,
  slotLabel,
  canSaveSlotLabel,
  isSavingSlotLabel = false,
  onSelectSlot,
  onSlotLabelChange,
  onSaveSlotLabel,
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

          if (isFilled && slot != null) {
            const label =
              slot.label ?? slot.content?.title ?? `Slot ${slotIndex}`;
            const isClearingThis = clearingSlotIndex === slotIndex;
            return (
              <li key={slotIndex}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Select Slot ${slotIndex}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectSlot(slotIndex)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSlot(slotIndex);
                    }
                  }}
                  className={cn(
                    "flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Slot {slotIndex}
                    </p>
                    <p className="truncate text-xs font-medium" title={label}>
                      {label}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Clear ${label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onClearSlot(slotIndex);
                    }}
                    disabled={clearingSlotIndex !== null}
                    className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
      {selectedSlotIndex !== null ? (
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergency-slot-label">Slot Name</Label>
            <Input
              id="emergency-slot-label"
              value={slotLabel}
              maxLength={64}
              placeholder="Enter slot name"
              onChange={(event) => onSlotLabelChange(event.target.value)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Used when activating Slot {selectedSlotIndex}.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onSaveSlotLabel}
              disabled={!canSaveSlotLabel || isSavingSlotLabel}
            >
              {isSavingSlotLabel ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
