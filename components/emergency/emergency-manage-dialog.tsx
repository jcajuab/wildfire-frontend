"use client";

import { useCallback, useState, type ReactElement } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import type { BackendContentListItem } from "@/lib/api/content-api";
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
  const { data, refetch } = useListEmergencySlotsQuery(undefined, {
    skip: !open,
  });
  const [setSlot] = useSetEmergencySlotMutation();
  const [clearSlot] = useClearEmergencySlotMutation();

  const [selectedSlotIndex, setSelectedSlotIndex] =
    useState<EmergencySlotIndex | null>(null);
  const [submittingContentId, setSubmittingContentId] = useState<string | null>(
    null,
  );
  const [clearingSlotIndex, setClearingSlotIndex] =
    useState<EmergencySlotIndex | null>(null);

  const slots = data?.slots ?? [];

  const handleSelectEmptySlot = useCallback((slotIndex: EmergencySlotIndex) => {
    setSelectedSlotIndex((current) =>
      current === slotIndex ? null : slotIndex,
    );
  }, []);

  const handleClearSlot = useCallback(
    async (slotIndex: EmergencySlotIndex) => {
      setClearingSlotIndex(slotIndex);
      try {
        await clearSlot({ slotIndex }).unwrap();
        toast.success(`Cleared Slot ${slotIndex}.`);
        await refetch();
      } catch (error) {
        notifyApiError(error, "Failed to clear emergency slot.");
      } finally {
        setClearingSlotIndex(null);
      }
    },
    [clearSlot, refetch],
  );

  const handleSelectContent = useCallback(
    async (content: BackendContentListItem) => {
      if (selectedSlotIndex === null) return;
      setSubmittingContentId(content.id);
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
        await refetch();
      } catch (error) {
        notifyApiError(error, "Failed to assign emergency content.");
      } finally {
        setSubmittingContentId(null);
      }
    },
    [selectedSlotIndex, setSlot, refetch],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-5xl max-h-[85vh]">
        <div className="grid grid-cols-1 sm:grid-cols-[280px_1px_1fr] h-[85vh] overflow-hidden">
          <div className="flex flex-col overflow-y-auto px-6 pt-10 pb-6 sm:py-6 sm:pt-10">
            <EmergencyAssetList
              slots={slots}
              selectedSlotIndex={selectedSlotIndex}
              onSelectEmptySlot={handleSelectEmptySlot}
              onClearSlot={handleClearSlot}
              clearingSlotIndex={clearingSlotIndex}
            />
          </div>
          <div
            className="hidden w-px shrink-0 bg-border sm:block"
            aria-hidden
          />
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden px-6 pt-10 pb-6 sm:py-6 sm:pt-10">
            <EmergencyContentPicker
              selectedSlotIndex={selectedSlotIndex}
              onSelect={handleSelectContent}
              submittingContentId={submittingContentId}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
