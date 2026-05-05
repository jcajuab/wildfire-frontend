"use client";

import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import {
  IconCheck,
  IconChevronRight,
  IconClipboardCheck,
  IconPhoto,
  IconSettings,
  IconWifi,
} from "@tabler/icons-react";

import { DisplayFormBody } from "@/components/displays/display-form-body";
import { GroupBadge } from "@/components/displays/group-badge";
import { StepIndicator } from "@/components/displays/step-indicator";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DisplayGroup } from "@/lib/api/displays-api";
import type { Display, DisplayOutput } from "@/types/display";

type WizardStep = 1 | 2 | 3 | 4;

interface WizardData {
  username: string;
  password: string;
  isNewDisplay: boolean;
  selectedOutput: string;
  displayName: string;
  groups: string[];
}

const initialWizardData: WizardData = {
  username: "pi",
  password: "",
  isNewDisplay: false,
  selectedOutput: "",
  displayName: "",
  groups: [],
};

const availableDisplayOutputs: DisplayOutput[] = [
  { name: "HDMI-0" },
  { name: "HDMI-1" },
];

interface AddDisplayWizardProps {
  readonly onRegister: (display: Omit<Display, "id" | "createdAt">) => void;
  readonly onClose: () => void;
  readonly existingGroups: readonly DisplayGroup[];
}

export function AddDisplayWizard({
  onRegister,
  onClose,
  existingGroups,
}: AddDisplayWizardProps): ReactElement {
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const portalContainerRef = useRef<HTMLDivElement>(null);

  const handleNext = useCallback(() => {
    if (step < 4) {
      setStep((prev) => (prev + 1) as WizardStep);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((prev) => (prev - 1) as WizardStep);
  }, [step]);

  const handleRegister = useCallback(() => {
    const groups = data.groups.map((name) => ({ name }));
    const normalizedSlug = data.displayName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug =
      normalizedSlug.length > 0
        ? normalizedSlug
        : `display-${crypto.randomUUID().slice(0, 8)}`;

    onRegister({
      slug,
      name: data.displayName,
      status: "READY",
      output: data.selectedOutput,
      groups,
    });
    onClose();
  }, [data, onRegister, onClose]);

  const selectOutput = useCallback((output: DisplayOutput) => {
    setData((prev) => ({
      ...prev,
      selectedOutput: output.name,
    }));
  }, []);

  const handleOutputGroupKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const options = availableDisplayOutputs;
      if (options.length === 0) return;
      const currentIndex = options.findIndex(
        (output) => output.name === data.selectedOutput,
      );
      const lastIndex = options.length - 1;

      let targetIndex: number | null = null;
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          targetIndex =
            currentIndex < 0 ? 0 : Math.min(currentIndex + 1, lastIndex);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          targetIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
          break;
        case "Home":
          targetIndex = 0;
          break;
        case "End":
          targetIndex = lastIndex;
          break;
        default:
          return;
      }

      event.preventDefault();
      const output = options[targetIndex];
      if (output) selectOutput(output);
    },
    [data.selectedOutput, selectOutput],
  );

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return data.username.length > 0 && data.password.length > 0;
      case 2:
        return data.selectedOutput.length > 0;
      case 3:
        return data.displayName.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">Add New Display</DialogTitle>
        <DialogDescription>
          Configure a new Raspberry Pi display for your WILDFIRE instance
        </DialogDescription>
      </DialogHeader>

      <StepIndicator currentStep={step} />

      <div className="flex flex-col gap-4 py-2">
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconWifi className="size-4" />
              Connect to Raspberry Pi
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={data.username}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconPhoto className="size-4" />
              Select Display Output
            </div>

            <div
              className="flex flex-col gap-2"
              role="radiogroup"
              aria-label="Display output"
              tabIndex={0}
              onKeyDown={handleOutputGroupKeyDown}
            >
              {availableDisplayOutputs.map((output) => (
                <button
                  key={output.name}
                  type="button"
                  role="radio"
                  tabIndex={data.selectedOutput === output.name ? 0 : -1}
                  aria-checked={data.selectedOutput === output.name}
                  onClick={() => selectOutput(output)}
                  className={`flex items-center justify-between rounded-md border border-border p-3 text-left transition-colors ${
                    data.selectedOutput === output.name
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{output.name}</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className={`flex size-5 items-center justify-center rounded-full border-2 ${
                      data.selectedOutput === output.name
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {data.selectedOutput === output.name && (
                      <div className="size-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconSettings className="size-4" />
              Configure Display
            </div>
            <DisplayFormBody
              mode="add"
              displayName={data.displayName}
              onDisplayNameChange={(value) =>
                setData((prev) => ({ ...prev, displayName: value }))
              }
              groups={data.groups}
              onGroupsChange={(names) =>
                setData((prev) => ({ ...prev, groups: names }))
              }
              existingGroups={existingGroups}
              portalContainer={portalContainerRef}
            />
            <div ref={portalContainerRef} />
          </>
        )}

        {step === 4 && (
          <>
            <div className="flex items-center gap-2 text-sm font-medium">
              <IconClipboardCheck className="size-4" />
              Review & Register
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-start gap-2">
                <IconPhoto className="mt-0.5 size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{data.displayName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Display Output:</span>
                <span>{data.selectedOutput}</span>

                <span className="text-muted-foreground">Display Groups:</span>
                <div className="flex flex-wrap gap-1">
                  {data.groups.length > 0 ? (
                    data.groups.map((name) => (
                      <GroupBadge key={name} name={name} />
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        {step === 1 ? (
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        ) : (
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        )}

        {step < 4 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex-1"
          >
            {step === 1 ? "Connect" : "Next"}
            <IconChevronRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={handleRegister} className="flex-1">
            Register
            <IconCheck className="size-4" />
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
