"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import { IconSettings } from "@tabler/icons-react";

import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";
import { DisplayGroupsCombobox } from "@/components/displays/display-groups-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DisplayGroup } from "@/lib/api/displays-api";
import {
  DISPLAY_OUTPUT_TYPES,
  parseDisplayOutput,
  toCanonicalDisplayOutput,
  type DisplayOutputType,
} from "@/lib/display-output";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { Display } from "@/types/display";

interface EditDisplayDialogProps {
  readonly display: Display | null;
  readonly existingGroups: readonly DisplayGroup[];
  readonly emergencyContentOptions?: readonly {
    readonly id: string;
    readonly title: string;
  }[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (display: Display) => Promise<boolean>;
  readonly canManageGroups?: boolean;
}

interface EditFormData {
  readonly displayName: string;
  readonly slug: string;
  readonly location: string;
  readonly ipAddress: string;
  readonly macAddress: string;
  readonly outputType: DisplayOutputType;
  readonly outputIndex: string;
  readonly resolutionWidth: string;
  readonly resolutionHeight: string;
  readonly emergencyContentId: string | null;
  readonly groups: readonly string[];
}

function createInitialFormData(display: Display): EditFormData {
  const parsedOutput = parseDisplayOutput(
    display.output === "Not available" ? null : display.output,
  );

  const [rawWidth, rawHeight] = display.resolution
    .split("x")
    .map((value) => value.trim());
  const width = rawWidth && Number.isFinite(Number(rawWidth)) ? rawWidth : "";
  const height =
    rawHeight && Number.isFinite(Number(rawHeight)) ? rawHeight : "";

  return {
    displayName: display.name,
    slug: display.slug,
    location: display.location,
    ipAddress: display.ipAddress,
    macAddress: display.macAddress,
    outputType: parsedOutput?.type ?? "HDMI",
    outputIndex: String(parsedOutput?.index ?? 0),
    resolutionWidth: width,
    resolutionHeight: height,
    emergencyContentId: display.emergencyContentId,
    groups: display.groups.map((group) => group.name),
  };
}

interface EditDisplayFormProps {
  readonly display: Display;
  readonly existingGroups: readonly DisplayGroup[];
  readonly emergencyContentOptions?: readonly {
    readonly id: string;
    readonly title: string;
  }[];
  readonly onClose: () => void;
  readonly onSave: (display: Display) => Promise<boolean>;
  readonly canManageGroups: boolean;
}

function EditDisplayForm({
  display,
  existingGroups,
  emergencyContentOptions = [],
  onClose,
  onSave,
  canManageGroups,
}: EditDisplayFormProps): ReactElement {
  const [formData, setFormData] = useState<EditFormData>(() =>
    createInitialFormData(display),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);

  const groupColorByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of existingGroups) {
      map.set(toDisplayGroupKey(group.name), group.colorIndex ?? 0);
    }
    return map;
  }, [existingGroups]);

  const outputIndexNumber = Number.parseInt(formData.outputIndex, 10);
  const hasValidOutputIndex =
    Number.isInteger(outputIndexNumber) && outputIndexNumber >= 0;
  const widthNumber = Number.parseInt(formData.resolutionWidth, 10);
  const heightNumber = Number.parseInt(formData.resolutionHeight, 10);
  const hasResolutionWidth = formData.resolutionWidth.trim().length > 0;
  const hasResolutionHeight = formData.resolutionHeight.trim().length > 0;
  const isResolutionPairProvided = hasResolutionWidth && hasResolutionHeight;
  const isResolutionPairEmpty = !hasResolutionWidth && !hasResolutionHeight;
  const hasValidResolution =
    isResolutionPairEmpty ||
    (isResolutionPairProvided &&
      Number.isInteger(widthNumber) &&
      widthNumber > 0 &&
      Number.isInteger(heightNumber) &&
      heightNumber > 0);

  const canSave =
    formData.displayName.trim().length > 0 &&
    formData.slug.trim().length > 0 &&
    hasValidOutputIndex &&
    hasValidResolution &&
    !isSaving;

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) return;

    const groups = dedupeDisplayGroupNames(formData.groups).map((name) => ({
      name,
      colorIndex: groupColorByKey.get(toDisplayGroupKey(name)) ?? 0,
    }));

    const output = toCanonicalDisplayOutput({
      type: formData.outputType,
      index: outputIndexNumber,
    });

    const resolution = isResolutionPairProvided
      ? `${String(widthNumber)}x${String(heightNumber)}`
      : "Not available";

    const updatedDisplay: Display = {
      ...display,
      name: formData.displayName,
      location: formData.location,
      ipAddress: formData.ipAddress,
      macAddress: formData.macAddress,
      output,
      resolution,
      emergencyContentId: formData.emergencyContentId,
      groups,
    };

    setIsSaving(true);
    try {
      const didSave = await onSave(updatedDisplay);
      if (didSave) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    display,
    formData,
    groupColorByKey,
    heightNumber,
    isResolutionPairProvided,
    isSaving,
    onClose,
    onSave,
    outputIndexNumber,
    widthNumber,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Details</DialogTitle>
        <DialogDescription className="sr-only">
          Update display details and grouping.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-display-name">Display Name</Label>
          <Input
            id="edit-display-name"
            value={formData.displayName}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                displayName: event.target.value,
              }))
            }
            disabled={isSaving}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-display-slug">Display Slug</Label>
          <Input
            id="edit-display-slug"
            value={formData.slug}
            disabled={true}
            readOnly={true}
          />
          <p className="text-xs text-muted-foreground">
            Slug is fixed after registration and used by display runtime
            identity.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-location">Physical Location</Label>
          <Input
            id="edit-location"
            value={formData.location}
            onChange={(event) =>
              setFormData((prev) => ({ ...prev, location: event.target.value }))
            }
            disabled={isSaving}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-ip">IP Address or Hostname</Label>
          <Input
            id="edit-ip"
            value={formData.ipAddress}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                ipAddress: event.target.value,
              }))
            }
            disabled={isSaving}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-mac">MAC Address</Label>
          <Input
            id="edit-mac"
            value={formData.macAddress}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                macAddress: event.target.value,
              }))
            }
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-output-type">Display Output Type</Label>
            <Select
              value={formData.outputType}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  outputType: value as DisplayOutputType,
                }))
              }
              disabled={isSaving}
            >
              <SelectTrigger id="edit-output-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_OUTPUT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-output-index">Display Output Index</Label>
            <Input
              id="edit-output-index"
              type="number"
              min={0}
              inputMode="numeric"
              value={formData.outputIndex}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  outputIndex: event.target.value,
                }))
              }
              aria-invalid={!hasValidOutputIndex}
              disabled={isSaving}
            />
            {!hasValidOutputIndex ? (
              <p className="text-xs text-destructive">
                Output index must be a non-negative integer.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-resolution-width">Resolution Width</Label>
            <Input
              id="edit-resolution-width"
              type="number"
              min={1}
              inputMode="numeric"
              value={formData.resolutionWidth}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  resolutionWidth: event.target.value,
                }))
              }
              aria-invalid={!hasValidResolution}
              disabled={isSaving}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-resolution-height">Resolution Height</Label>
            <Input
              id="edit-resolution-height"
              type="number"
              min={1}
              inputMode="numeric"
              value={formData.resolutionHeight}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  resolutionHeight: event.target.value,
                }))
              }
              aria-invalid={!hasValidResolution}
              disabled={isSaving}
            />
          </div>
        </div>
        {!hasValidResolution ? (
          <p className="text-xs text-destructive">
            Resolution requires positive width and height, or leave both fields
            empty.
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-emergency-content">Emergency Content</Label>
          <Select
            value={formData.emergencyContentId ?? "__none__"}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                emergencyContentId: value === "__none__" ? null : value,
              }))
            }
            disabled={isSaving}
          >
            <SelectTrigger id="edit-emergency-content">
              <SelectValue placeholder="Select emergency content" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {emergencyContentOptions.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Assign a READY image, video, or PDF for emergency override mode.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="edit-groups">Display Groups (Optional)</Label>
            {canManageGroups ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsGroupManagerOpen(true)}
                disabled={isSaving}
              >
                <IconSettings className="size-4" />
                Manage Groups
              </Button>
            ) : null}
          </div>
          <DisplayGroupsCombobox
            id="edit-groups"
            value={formData.groups}
            onValueChange={(names) =>
              setFormData((prev) => ({ ...prev, groups: names }))
            }
            existingGroups={existingGroups}
            showLabel={false}
            disabled={isSaving}
            aboveModal={true}
          />
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="flex-1"
        >
          <IconSettings className="size-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>

      {isGroupManagerOpen ? (
        <DisplayGroupManagerDialog
          open={isGroupManagerOpen}
          onOpenChange={setIsGroupManagerOpen}
          groups={existingGroups}
          onGroupRenamed={({ previousName, nextName }) => {
            const previousKey = toDisplayGroupKey(previousName);
            setFormData((prev) => ({
              ...prev,
              groups: dedupeDisplayGroupNames(
                prev.groups.map((name) =>
                  toDisplayGroupKey(name) === previousKey ? nextName : name,
                ),
              ),
            }));
          }}
          onGroupDeleted={({ name }) => {
            const deletedKey = toDisplayGroupKey(name);
            setFormData((prev) => ({
              ...prev,
              groups: prev.groups.filter(
                (groupName) => toDisplayGroupKey(groupName) !== deletedKey,
              ),
            }));
          }}
        />
      ) : null}
    </>
  );
}

export function EditDisplayDialog({
  display,
  existingGroups,
  emergencyContentOptions = [],
  open,
  onOpenChange,
  onSave,
  canManageGroups = true,
}: EditDisplayDialogProps): ReactElement | null {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        onOpenChange(true);
        return;
      }

      handleClose();
    },
    [handleClose, onOpenChange],
  );

  if (!display) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          const target = (e.detail?.originalEvent as PointerEvent)
            ?.target as HTMLElement | null;
          if (target?.closest('[data-slot="combobox-content"]')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e) => e.preventDefault()}
      >
        <EditDisplayForm
          key={`${display.id}:${open ? "open" : "closed"}`}
          display={display}
          existingGroups={existingGroups}
          emergencyContentOptions={emergencyContentOptions}
          onClose={handleClose}
          onSave={onSave}
          canManageGroups={canManageGroups}
        />
      </DialogContent>
    </Dialog>
  );
}
