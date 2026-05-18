"use client";

import { useCallback, useMemo, useState, type ReactElement } from "react";
import Image from "next/image";
import {
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UseGlobalEmergencyReturn } from "@/hooks/use-global-emergency";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useClearEmergencySlotMutation,
  useListEmergencySlotsQuery,
  useSetEmergencySlotMutation,
  type EmergencySlot,
  type EmergencySlotIndex,
} from "@/lib/api/emergency-slots-api";
import type { BackendContentListItem } from "@/lib/api/content-api";
import {
  getTextThumbnailHtml,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";
import { cn } from "@/lib/utils";
import { EmergencyContentPicker } from "./emergency-content-picker";

const SLOT_INDICES: readonly EmergencySlotIndex[] = [1, 2, 3, 4, 5] as const;

interface StartEmergencyDialogProps {
  readonly trigger: ReactElement;
  readonly emergency: UseGlobalEmergencyReturn;
}

export function StartEmergencyDialog({
  trigger,
  emergency,
}: StartEmergencyDialogProps): ReactElement {
  const { canRead, canUpdate, isBusy, activate } = emergency;
  const [isOpen, setIsOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] =
    useState<EmergencySlotIndex | null>(null);
  const [activatingSlotIndex, setActivatingSlotIndex] =
    useState<EmergencySlotIndex | null>(null);
  const [clearingSlotIndex, setClearingSlotIndex] =
    useState<EmergencySlotIndex | null>(null);
  const [submittingContentId, setSubmittingContentId] = useState<string | null>(
    null,
  );
  const [selectedContent, setSelectedContent] =
    useState<BackendContentListItem | null>(null);
  const [setSlot] = useSetEmergencySlotMutation();
  const [clearSlot] = useClearEmergencySlotMutation();
  const { data, refetch, isFetching } = useListEmergencySlotsQuery(undefined, {
    skip: !canRead || !isOpen,
  });

  const slotsByIndex = useMemo(() => {
    const result = new Map<EmergencySlotIndex, EmergencySlot>();
    for (const slot of data?.slots ?? []) {
      result.set(slot.slotIndex, slot);
    }
    return result;
  }, [data?.slots]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (
        isBusy ||
        activatingSlotIndex !== null ||
        clearingSlotIndex !== null ||
        submittingContentId !== null
      ) {
        return;
      }
      setIsOpen(open);
      if (!open) {
        setEditingSlotIndex(null);
        setSelectedContent(null);
      }
    },
    [activatingSlotIndex, clearingSlotIndex, isBusy, submittingContentId],
  );

  const handleActivate = useCallback(
    async (slotIndex: EmergencySlotIndex) => {
      if (!canUpdate || isBusy || activatingSlotIndex !== null) return;
      setActivatingSlotIndex(slotIndex);
      try {
        const activated = await activate(slotIndex);
        if (activated) {
          setIsOpen(false);
        }
      } finally {
        setActivatingSlotIndex(null);
      }
    },
    [activate, activatingSlotIndex, canUpdate, isBusy],
  );

  const handleClearSlot = useCallback(
    async (slotIndex: EmergencySlotIndex) => {
      if (!canUpdate || clearingSlotIndex !== null || submittingContentId) {
        return;
      }
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
    [canUpdate, clearSlot, clearingSlotIndex, refetch, submittingContentId],
  );

  const handleSaveContent = useCallback(async () => {
    if (editingSlotIndex === null || selectedContent === null) return;
    const content = selectedContent;
    setSubmittingContentId(content.id);
    try {
      await setSlot({
        slotIndex: editingSlotIndex,
        contentId: content.id,
      }).unwrap();
      toast.success(`Assigned "${content.title}" to Slot ${editingSlotIndex}.`);
      await refetch();
      setSelectedContent(null);
      setEditingSlotIndex(null);
    } catch (error) {
      notifyApiError(error, "Failed to assign emergency content.");
    } finally {
      setSubmittingContentId(null);
    }
  }, [editingSlotIndex, refetch, selectedContent, setSlot]);

  if (!canRead) {
    return trigger;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className={cn(
            "flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl",
            editingSlotIndex === null ? "h-auto" : "h-[min(85vh,42rem)]",
          )}
        >
          <DialogHeader className="px-4 pt-4 pb-3">
            <DialogTitle>
              {editingSlotIndex === null
                ? "Start Emergency"
                : "Content Library"}
            </DialogTitle>
            <DialogDescription>
              {editingSlotIndex === null
                ? "Choose an emergency asset to show across all displays."
                : `Choose content for Slot ${editingSlotIndex}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="border-t border-border" aria-hidden />
          <div className="min-h-0 flex-1 overflow-hidden">
            {isFetching && !data ? (
              <div className="m-4 flex min-h-56 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                Loading emergency assets...
              </div>
            ) : editingSlotIndex !== null ? (
              <EmergencyContentPicker
                selectedSlotIndex={editingSlotIndex}
                selectedContentId={selectedContent?.id ?? null}
                onSelect={setSelectedContent}
                submittingContentId={submittingContentId}
              />
            ) : (
              <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
                {SLOT_INDICES.map((slotIndex) => {
                  const slot = slotsByIndex.get(slotIndex);
                  return (
                    <li key={slotIndex} className="min-w-0">
                      <EmergencySlotCard
                        slotIndex={slotIndex}
                        slot={slot}
                        disabled={!canUpdate || isBusy}
                        isActivating={activatingSlotIndex === slotIndex}
                        isClearing={clearingSlotIndex === slotIndex}
                        onActivate={handleActivate}
                        onClear={handleClearSlot}
                        onChooseContent={() => {
                          setSelectedContent(null);
                          setEditingSlotIndex(slotIndex);
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <DialogFooter className="border-t border-border px-4 py-3">
            <Button
              type="button"
              variant="outline"
              disabled={
                isBusy ||
                activatingSlotIndex !== null ||
                clearingSlotIndex !== null ||
                submittingContentId !== null
              }
              onClick={() => {
                if (editingSlotIndex !== null) {
                  setSelectedContent(null);
                  setEditingSlotIndex(null);
                  void refetch();
                  return;
                }
                setIsOpen(false);
              }}
            >
              {editingSlotIndex === null ? "Cancel" : "Back"}
            </Button>
            {editingSlotIndex !== null ? (
              <Button
                type="button"
                disabled={
                  selectedContent === null ||
                  isBusy ||
                  activatingSlotIndex !== null ||
                  clearingSlotIndex !== null ||
                  submittingContentId !== null
                }
                onClick={() => {
                  void handleSaveContent();
                }}
              >
                {submittingContentId !== null ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface EmergencySlotCardProps {
  readonly slotIndex: EmergencySlotIndex;
  readonly slot?: EmergencySlot;
  readonly disabled: boolean;
  readonly isActivating: boolean;
  readonly isClearing: boolean;
  readonly onActivate: (slotIndex: EmergencySlotIndex) => void;
  readonly onClear: (slotIndex: EmergencySlotIndex) => void;
  readonly onChooseContent: () => void;
}

function EmergencySlotCard({
  slotIndex,
  slot,
  disabled,
  isActivating,
  isClearing,
  onActivate,
  onClear,
  onChooseContent,
}: EmergencySlotCardProps): ReactElement {
  const content = slot?.content ?? null;
  const isFilled = content != null && slot?.contentId != null;
  const isTextContent = content?.type === "TEXT";
  const textThumbnailHtml = isTextContent
    ? getTextThumbnailHtml(content)
    : null;
  const textThumbnailText = isTextContent
    ? getTextThumbnailText(content)
    : null;
  const Icon =
    content?.type === "VIDEO"
      ? IconVideo
      : content?.type === "TEXT"
        ? IconFileText
        : IconPhoto;

  if (!isFilled || !content) {
    return (
      <button
        type="button"
        className="group flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/15 p-3 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        onClick={onChooseContent}
      >
        <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-current/40">
          <IconPlus className="size-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-medium">Slot {slotIndex}</span>
      </button>
    );
  }

  return (
    <article className="group relative aspect-square overflow-hidden rounded-md border border-border bg-background transition-[border-color,background-color] duration-150 hover:border-primary/40 hover:bg-primary/5 focus-within:border-primary/40 focus-within:bg-primary/5">
      <button
        type="button"
        aria-label={`Start emergency with ${content.title}`}
        disabled={disabled || isActivating || isClearing}
        className="flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden text-left focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => onActivate(slotIndex)}
      >
        <span className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted/50">
          {isTextContent && textThumbnailHtml ? (
            <span className="relative flex h-full w-full items-start overflow-hidden p-2">
              <span
                className={cn(
                  RICH_TEXT_PREVIEW_CLASSES,
                  "text-[0.625rem] leading-snug [&_blockquote]:my-1 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-2 [&_ol]:my-1 [&_ol]:ml-4 [&_td]:px-1 [&_td]:py-0.5 [&_th]:px-1 [&_th]:py-0.5 [&_ul]:my-1 [&_ul]:ml-4",
                )}
                aria-label={textThumbnailText ?? content.title}
                dangerouslySetInnerHTML={{ __html: textThumbnailHtml }}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-muted/90 to-transparent" />
            </span>
          ) : content.thumbnailUrl ? (
            <Image
              src={content.thumbnailUrl}
              alt={`${content.title} thumbnail`}
              fill
              sizes="(max-width: 1024px) 50vw, 12rem"
              className="object-cover"
            />
          ) : (
            <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
          )}
          {isActivating ? (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <IconLoader2
                className="size-4 animate-spin text-primary"
                aria-hidden="true"
              />
            </span>
          ) : null}
        </span>
        <span className="flex min-h-11 items-center p-3">
          <span className="line-clamp-2 text-xs font-medium text-foreground">
            {content.title}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Clear Slot ${slotIndex}`}
        disabled={disabled || isActivating || isClearing}
        className="absolute top-2 right-2 flex size-7 translate-y-1 items-center justify-center rounded-md border border-destructive/20 bg-destructive/10 text-destructive opacity-0 shadow-none transition-[background-color,opacity,transform] hover:border-destructive/30 hover:bg-destructive/20 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onClear(slotIndex);
        }}
      >
        {isClearing ? (
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <IconTrash className="size-4" aria-hidden="true" />
        )}
      </button>
    </article>
  );
}
