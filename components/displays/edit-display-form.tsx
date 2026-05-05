"use client";

import type { ReactElement, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

import { DisplayGroupsTagsInput } from "@/components/displays/display-groups-tags-input";
import { Button } from "@/components/ui/button";
import {
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DisplayGroup } from "@/lib/api/displays-api";
import {
  DISPLAY_OUTPUT_TYPES,
  parseDisplayOutput,
  toCanonicalDisplayOutput,
  type DisplayOutputType,
} from "@/lib/display-output";
import { dedupeDisplayGroupNames } from "@/lib/display-group-normalization";
import type { Display } from "@/types/display";

interface EditFormData {
  readonly displayName: string;
  readonly slug: string;
  readonly outputType: DisplayOutputType;
  readonly outputIndex: string;
  readonly emergencyContentId: string | null;
  readonly groups: readonly string[];
}

function createInitialFormData(display: Display): EditFormData {
  const parsedOutput = parseDisplayOutput(
    display.output === "Not available" ? null : display.output,
  );

  return {
    displayName: display.name,
    slug: display.slug,
    outputType: parsedOutput?.type ?? "HDMI",
    outputIndex: String(parsedOutput?.index ?? 0),
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
}

interface FieldLabelRowProps {
  readonly htmlFor: string;
  readonly children: ReactNode;
  readonly help?: {
    readonly label: string;
    readonly content: ReactNode;
  };
}

function FieldLabelRow({
  htmlFor,
  children,
  help,
}: FieldLabelRowProps): ReactElement {
  return (
    <div className="flex min-h-5 items-center gap-1">
      <Label htmlFor={htmlFor}>{children}</Label>
      {help ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={help.label}
              className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            >
              <IconInfoCircle className="size-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{help.content}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function EditDisplayForm({
  display,
  existingGroups,
  emergencyContentOptions = [],
  onClose,
  onSave,
}: EditDisplayFormProps): ReactElement {
  const [formData, setFormData] = useState<EditFormData>(() =>
    createInitialFormData(display),
  );
  const [isSaving, setIsSaving] = useState(false);
  const portalContainerRef = useRef<HTMLDivElement>(null);

  const outputIndexNumber = Number.parseInt(formData.outputIndex, 10);
  const hasValidOutputIndex =
    Number.isInteger(outputIndexNumber) && outputIndexNumber >= 0;

  const canSave =
    formData.displayName.trim().length > 0 &&
    formData.slug.trim().length > 0 &&
    hasValidOutputIndex &&
    !isSaving;

  const handleSave = useCallback(async () => {
    if (!canSave || isSaving) return;
    const groups = dedupeDisplayGroupNames(formData.groups).map((name) => ({
      name,
    }));
    const output = toCanonicalDisplayOutput({
      type: formData.outputType,
      index: outputIndexNumber,
    });

    setIsSaving(true);
    try {
      const didSave = await onSave({
        ...display,
        name: formData.displayName,
        output,
        resolution: display.resolution,
        emergencyContentId: formData.emergencyContentId,
        groups,
      });
      if (didSave) onClose();
    } finally {
      setIsSaving(false);
    }
  }, [
    canSave,
    display,
    formData,
    isSaving,
    onClose,
    onSave,
    outputIndexNumber,
  ]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Display</DialogTitle>
        <DialogDescription>
          Update display details and groups.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <FieldLabelRow htmlFor="edit-display-name">
            Display Name
          </FieldLabelRow>
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

        <div className="space-y-2">
          <FieldLabelRow
            htmlFor="edit-display-slug"
            help={{
              label: "Display slug help",
              content:
                "Slug is fixed after registration and used by display runtime identity.",
            }}
          >
            Display Slug
          </FieldLabelRow>
          <Input
            id="edit-display-slug"
            value={formData.slug}
            disabled
            readOnly
          />
        </div>

        <div className="space-y-2">
          <FieldLabelRow htmlFor="edit-groups">
            Display Groups
          </FieldLabelRow>
          <DisplayGroupsTagsInput
            id="edit-groups"
            value={formData.groups}
            onValueChange={(names) =>
              setFormData((prev) => ({ ...prev, groups: names }))
            }
            existingGroups={existingGroups}
            disabled={isSaving}
            showLabel={false}
            portalContainer={portalContainerRef}
          />
        </div>
        <div ref={portalContainerRef} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FieldLabelRow htmlFor="edit-output-type">
              Output Type
            </FieldLabelRow>
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
              <SelectTrigger id="edit-output-type" className="w-full">
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
          <div className="space-y-2">
            <FieldLabelRow htmlFor="edit-output-index">
              Output Index
            </FieldLabelRow>
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

        <div className="space-y-2">
          <FieldLabelRow
            htmlFor="edit-emergency-content"
            help={{
              label: "Emergency content help",
              content:
                "Assign a READY image, video, or PDF for emergency override mode.",
            }}
          >
            Emergency Content
          </FieldLabelRow>
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
            <SelectTrigger id="edit-emergency-content" className="w-full">
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
        </div>
      </div>

      <DialogFooter className="flex-row justify-end">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={() => void handleSave()} disabled={!canSave}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
