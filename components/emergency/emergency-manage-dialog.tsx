"use client";

import { useCallback, useState, type ReactElement } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import type { BackendContent } from "@/lib/api/content-api";
import {
  useClearEmergencySlotMutation,
  useListEmergencySlotsQuery,
  useSetEmergencySlotMutation,
  type EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";
import { EmergencyAssetList } from "./emergency-asset-list";
import { EmergencyContentPicker } from "./emergency-content-picker";

interface EmergencyManageDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function EmergencyManageDialog({
  open,
  onOpenChange,
}: EmergencyManageDialogProps): ReactElement {
  const { data } = useListEmergencySlotsQuery(undefined, { skip: !open });
  const [setSlot, { isLoading: isSetting }] = useSetEmergencySlotMutation();
  const [clearSlot, { isLoading: isClearing }] =
    useClearEmergencySlotMutation();

  const [selectedSlotIndex, setSelectedSlotIndex] =
    useState<EmergencySlotIndex | null>(null);

  const slots = data?.slots ?? [];

  const handleSelectEmptySlot = useCallback((slotIndex: EmergencySlotIndex) => {
    setSelectedSlotIndex(slotIndex);
  }, []);

  const handleClearSlot = useCallback(
    async (slotIndex: EmergencySlotIndex) => {
      try {
        await clearSlot({ slotIndex }).unwrap();
        toast.success(`Cleared Slot ${slotIndex}.`);
      } catch (error) {
        notifyApiError(error, "Failed to clear emergency slot.");
      }
    },
    [clearSlot],
  );

  const handleSelectContent = useCallback(
    async (content: BackendContent) => {
      if (selectedSlotIndex === null) return;
      try {
        await setSlot({
          slotIndex: selectedSlotIndex,
          contentId: content.id,
          label: content.title,
        }).unwrap();
        toast.success(
          `Assigned "${content.title}" to Slot ${selectedSlotIndex}.`,
        );
        setSelectedSlotIndex(null);
      } catch (error) {
        notifyApiError(error, "Failed to assign emergency content.");
      }
    },
    [selectedSlotIndex, setSlot],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Manage Emergency Assets</DialogTitle>
          <DialogDescription>
            Configure up to five emergency presets that can be activated from
            the sidebar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
          <EmergencyAssetList
            slots={slots}
            selectedSlotIndex={selectedSlotIndex}
            onSelectEmptySlot={handleSelectEmptySlot}
            onClearSlot={handleClearSlot}
            isClearing={isClearing}
          />
          <EmergencyContentPicker
            selectedSlotIndex={selectedSlotIndex}
            onSelect={handleSelectContent}
            isSubmitting={isSetting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
