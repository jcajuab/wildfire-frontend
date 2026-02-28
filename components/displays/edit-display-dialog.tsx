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
import type { DisplayGroup } from "@/lib/api/displays-api";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { Display } from "@/types/display";

interface EditDisplayDialogProps {
  readonly display: Display | null;
  readonly existingGroups: readonly DisplayGroup[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (display: Display) => Promise<boolean>;
  readonly canManageGroups?: boolean;
}

interface EditFormData {
  readonly displayName: string;
  readonly location: string;
  readonly ipAddress: string;
  readonly macAddress: string;
  readonly selectedOutput: string | null;
  readonly selectedResolution: string;
  readonly groups: readonly string[];
}

const outputOptions: ReadonlyArray<{
  readonly value: string | null;
  readonly label: string;
  readonly description: string;
}> = [
  {
    value: null,
    label: "None",
    description: "No fixed output selected",
  },
  {
    value: "HDMI-0",
    label: "HDMI-0",
    description: "Primary HDMI output",
  },
  {
    value: "HDMI-1",
    label: "HDMI-1",
    description: "Secondary HDMI output",
  },
];

function createInitialFormData(display: Display): EditFormData {
  return {
    displayName: display.name,
    location: display.location,
    ipAddress: display.ipAddress,
    macAddress: display.macAddress,
    selectedOutput:
      display.displayOutput === "Not available" ? null : display.displayOutput,
    selectedResolution: display.resolution,
    groups: display.groups.map((group) => group.name),
  };
}

interface EditDisplayFormProps {
  readonly display: Display;
  readonly existingGroups: readonly DisplayGroup[];
  readonly onClose: () => void;
  readonly onSave: (display: Display) => Promise<boolean>;
  readonly canManageGroups: boolean;
}

/**
 * Inner form component that initializes state from props on mount.
 * Using a key prop on this component forces remount when display changes,
 * avoiding the need for useEffect to sync state with props.
 */
function EditDisplayForm({
  display,
  existingGroups,
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

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    const normalizedResolution = formData.selectedResolution.trim();
    const resolutionForSave =
      normalizedResolution.length === 0 ||
      normalizedResolution.toLowerCase() === "not available"
        ? "Not available"
        : normalizedResolution;

    const groups = dedupeDisplayGroupNames(formData.groups).map((name) => ({
      name,
      colorIndex: groupColorByKey.get(toDisplayGroupKey(name)) ?? 0,
    }));

    const updatedDisplay: Display = {
      ...display,
      name: formData.displayName,
      location: formData.location,
      ipAddress: formData.ipAddress,
      macAddress: formData.macAddress,
      displayOutput: formData.selectedOutput ?? "Not available",
      resolution: resolutionForSave,
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
  }, [display, formData, groupColorByKey, isSaving, onClose, onSave]);

  const normalizedResolution = formData.selectedResolution.trim();
  const isUnknownResolution =
    normalizedResolution.length === 0 ||
    normalizedResolution.toLowerCase() === "not available";
  const [screenWidthRaw, screenHeightRaw, ...extraParts] = normalizedResolution
    .split("x")
    .map((value) => value.trim());
  const hasNumericResolution =
    extraParts.length === 0 &&
    screenWidthRaw !== undefined &&
    screenHeightRaw !== undefined &&
    Number.isInteger(Number(screenWidthRaw)) &&
    Number(screenWidthRaw) > 0 &&
    Number.isInteger(Number(screenHeightRaw)) &&
    Number(screenHeightRaw) > 0;
  const hasValidResolution = isUnknownResolution || hasNumericResolution;
  const canSave =
    formData.displayName.trim().length > 0 && hasValidResolution && !isSaving;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Details</DialogTitle>
        <DialogDescription className="sr-only">
          Update display identity, network metadata, output, and grouping.
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

        <div className="flex flex-col gap-1.5">
          <Label>Display Output</Label>
          <div className="flex flex-col gap-2">
            {outputOptions.map((option) => (
              <button
                key={option.value ?? "none"}
                type="button"
                role="radio"
                aria-checked={formData.selectedOutput === option.value}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedOutput:
                      option.value !== null &&
                      prev.selectedOutput === option.value
                        ? null
                        : option.value,
                  }))
                }
                disabled={isSaving}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  formData.selectedOutput === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
                <div
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    formData.selectedOutput === option.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {formData.selectedOutput === option.value ? (
                    <div className="size-2 rounded-full bg-white" />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-resolution">Resolution</Label>
          <Input
            id="edit-resolution"
            placeholder="e.g. 1920x1080"
            value={formData.selectedResolution}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                selectedResolution: event.target.value,
              }))
            }
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Required format: width x height (e.g. 1366x768)
          </p>
          {!hasValidResolution ? (
            <p className="text-xs text-destructive">
              Resolution must be numeric width x height (for example 1920x1080).
            </p>
          ) : null}
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
  open,
  onOpenChange,
  onSave,
  canManageGroups = true,
}: EditDisplayDialogProps): ReactElement | null {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!display) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <EditDisplayForm
          key={display.id}
          display={display}
          existingGroups={existingGroups}
          onClose={handleClose}
          onSave={onSave}
          canManageGroups={canManageGroups}
        />
      </DialogContent>
    </Dialog>
  );
}
