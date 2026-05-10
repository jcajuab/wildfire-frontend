"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { IconPlus } from "@tabler/icons-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UseGlobalEmergencyReturn } from "@/hooks/use-global-emergency";
import {
  useListEmergencySlotsQuery,
  type EmergencySlot,
  type EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";

const EmergencyManageDialog = dynamic(
  () =>
    import("./emergency-manage-dialog").then(
      (mod) => mod.EmergencyManageDialog,
    ),
  { ssr: false },
);

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface EmergencySlotDropdownProps {
  readonly trigger: ReactNode;
  readonly emergency: UseGlobalEmergencyReturn;
}

export function EmergencySlotDropdown({
  trigger,
  emergency,
}: EmergencySlotDropdownProps): ReactElement {
  const { isActive, canRead, canUpdate, isBusy, activate, deactivate } =
    emergency;
  const [isOpen, setIsOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const { data } = useListEmergencySlotsQuery(undefined, {
    skip: !canRead || (!isOpen && !isManageOpen),
  });

  const slotsByIndex = new Map<EmergencySlotIndex, EmergencySlot>();
  for (const slot of data?.slots ?? []) {
    slotsByIndex.set(slot.slotIndex, slot);
  }
  if (!canRead) {
    return <>{trigger}</>;
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={6}
          className="min-w-56"
        >
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
                const label = slot?.content?.title ?? `Slot ${slotIndex}`;

                if (!isFilled) {
                  return (
                    <DropdownMenuItem
                      key={slotIndex}
                      disabled
                      className="justify-center border border-dashed border-border/60 text-center text-muted-foreground"
                    >
                      Slot {slotIndex}
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={slotIndex}
                    disabled={!canUpdate || isBusy}
                    className="justify-center text-center"
                    onSelect={() => {
                      void activate(slotIndex);
                    }}
                  >
                    {label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-center"
                onSelect={() => {
                  setIsManageOpen(true);
                }}
              >
                <IconPlus className="size-3.5" aria-hidden="true" />
                Add emergency assets
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isManageOpen ? (
        <EmergencyManageDialog
          open={isManageOpen}
          onOpenChange={setIsManageOpen}
        />
      ) : null}
    </>
  );
}
