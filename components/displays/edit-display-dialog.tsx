"use client";

import { useState, useCallback } from "react";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Display, DisplayOutput } from "@/types/display";

interface EditDisplayDialogProps {
  readonly display: Display | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave: (display: Display) => void;
}

interface EditFormData {
  displayName: string;
  location: string;
  ipAddress: string;
  selectedOutput: string;
  selectedResolution: string;
  groups: readonly string[];
}

// Mock display outputs for demonstration
const mockDisplayOutputs: readonly DisplayOutput[] = [
  { name: "HDMI-0", resolution: "1366x768" },
  { name: "HDMI-1", resolution: "1366x768" },
];

function createInitialFormData(display: Display): EditFormData {
  return {
    displayName: display.name,
    location: display.location,
    ipAddress: display.ipAddress,
    selectedOutput: display.displayOutput,
    selectedResolution: display.resolution,
    groups: [...display.groups],
  };
}

interface EditDisplayFormProps {
  readonly display: Display;
  readonly onClose: () => void;
  readonly onSave: (display: Display) => void;
}

/**
 * Inner form component that initializes state from props on mount.
 * Using a key prop on this component forces remount when display changes,
 * avoiding the need for useEffect to sync state with props.
 */
function EditDisplayForm({
  display,
  onClose,
  onSave,
}: EditDisplayFormProps): React.ReactElement {
  const [formData, setFormData] = useState<EditFormData>(() =>
    createInitialFormData(display),
  );
  const [groupInput, setGroupInput] = useState("");

  const handleSave = useCallback(() => {
    const updatedDisplay: Display = {
      ...display,
      name: formData.displayName,
      location: formData.location,
      ipAddress: formData.ipAddress,
      displayOutput: formData.selectedOutput,
      resolution: formData.selectedResolution,
      groups: [...formData.groups],
    };

    onSave(updatedDisplay);
    onClose();
  }, [display, formData, onSave, onClose]);

  const handleAddGroup = useCallback(() => {
    if (groupInput.trim() && !formData.groups.includes(groupInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        groups: [...prev.groups, groupInput.trim()],
      }));
      setGroupInput("");
    }
  }, [groupInput, formData.groups]);

  const handleRemoveGroup = useCallback((group: string) => {
    setFormData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g !== group),
    }));
  }, []);

  const canSave =
    formData.displayName.length > 0 &&
    formData.location.length > 0 &&
    formData.ipAddress.length > 0 &&
    formData.selectedOutput.length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Details</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-display-name">Display Name</Label>
          <Input
            id="edit-display-name"
            value={formData.displayName}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                displayName: e.target.value,
              }))
            }
          />
        </div>

        {/* Physical Location */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-location">Physical Location</Label>
          <Input
            id="edit-location"
            value={formData.location}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
          />
        </div>

        {/* IP Address */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-ip">IP Address or Hostname</Label>
          <Input
            id="edit-ip"
            value={formData.ipAddress}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, ipAddress: e.target.value }))
            }
          />
        </div>

        {/* Display Output */}
        <div className="flex flex-col gap-1.5">
          <Label>Display Output</Label>
          <div className="flex flex-col gap-2">
            {mockDisplayOutputs.map((output) => (
              <button
                key={output.name}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    selectedOutput: output.name,
                    selectedResolution: output.resolution,
                  }))
                }
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  formData.selectedOutput === output.name
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{output.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {output.resolution}
                  </span>
                </div>
                <div
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    formData.selectedOutput === output.name
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {formData.selectedOutput === output.name && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Display Groups */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-groups">Display Groups (Optional)</Label>
          <Input
            id="edit-groups"
            placeholder="Add display groups or create a new one"
            value={groupInput}
            onChange={(e) => setGroupInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddGroup();
              }
            }}
          />
          {formData.groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.groups.map((group) => (
                <Badge key={group} variant="secondary" className="gap-1 pr-1">
                  {group}
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(group)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <IconX className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSave} className="flex-1">
          <IconDeviceFloppy className="size-4" />
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditDisplayDialog({
  display,
  open,
  onOpenChange,
  onSave,
}: EditDisplayDialogProps): React.ReactElement | null {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  if (!display) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Key prop forces remount when display changes, resetting form state */}
        <EditDisplayForm
          key={display.id}
          display={display}
          onClose={handleClose}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}
