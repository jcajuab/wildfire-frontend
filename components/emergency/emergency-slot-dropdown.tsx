"use client";

import {
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { IconPlus } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGlobalEmergency } from "@/hooks/use-global-emergency";
import {
  useListEmergencySlotsQuery,
  type EmergencySlot,
  type EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";
import { EmergencyManageDialog } from "./emergency-manage-dialog";

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface EmergencySlotDropdownProps {
  readonly trigger: ReactNode;
}

export function EmergencySlotDropdown({
  trigger,
}: EmergencySlotDropdownProps): ReactElement {
  const { isActive, canRead, canUpdate, isBusy, activate, deactivate } =
    useGlobalEmergency();
  const { data } = useListEmergencySlotsQuery(undefined, { skip: !canRead });
  const [isManageOpen, setIsManageOpen] = useState(false);

  const slotsByIndex = new Map<EmergencySlotIndex, EmergencySlot>();
  for (const slot of data?.slots ?? []) {
    slotsByIndex.set(slot.slotIndex, slot);
  }
  const filledCount = SLOT_INDICES.reduce((acc, index) => {
    const slot = slotsByIndex.get(index);
    return slot != null && slot.contentId != null ? acc + 1 : acc;
  }, 0);
  const emptyCount = SLOT_INDICES.length - filledCount;

  if (!canRead) {
    return <>{trigger}</>;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={6} className="min-w-56">
          {isActive ? (
            <DropdownMenuItem
              variant="destructive"
              disabled={!canUpdate || isBusy}
              onSelect={() => {
                void deactivate();
              }}
            >
              Stop Emergency
            </DropdownMenuItem>
          ) : (
            <>
              {SLOT_INDICES.map((slotIndex) => {
                const slot = slotsByIndex.get(slotIndex);
                const isFilled = slot != null && slot.contentId != null;
                const label =
                  slot?.label ?? slot?.content?.title ?? `Slot ${slotIndex}`;

                if (!isFilled) {
                  return (
                    <DropdownMenuItem
                      key={slotIndex}
                      disabled
                      className="border border-dashed border-border/60 text-muted-foreground"
                    >
                      Slot {slotIndex}
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={slotIndex}
                    disabled={!canUpdate || isBusy}
                    onSelect={() => {
                      void activate(slotIndex);
                    }}
                  >
                    {label}
                  </DropdownMenuItem>
                );
              })}
              <div className="px-2 py-1 text-[0.625rem] uppercase tracking-wide text-muted-foreground">
                {emptyCount} of {SLOT_INDICES.length} slots empty
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  setIsManageOpen(true);
                }}
              >
                <IconPlus className="size-3.5" aria-hidden="true" />
                Add assets
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <EmergencyManageDialog
        open={isManageOpen}
        onOpenChange={setIsManageOpen}
      />
    </>
  );
}
