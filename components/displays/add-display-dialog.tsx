"use client";

import type { ReactElement } from "react";
import { useState, useCallback } from "react";
import {
  IconCheck,
  IconChevronRight,
  IconDeviceDesktop,
  IconMapPin,
  IconWifi,
  IconSettings,
  IconClipboardCheck,
  IconX,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Display, DisplayOutput } from "@/types/display";

type WizardStep = 1 | 2 | 3 | 4;

interface AddDisplayDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegister: (display: Omit<Display, "id" | "createdAt">) => void;
}

interface WizardData {
  ipAddress: string;
  username: string;
  password: string;
  isNewDevice: boolean;
  selectedOutput: string;
  selectedResolution: string;
  displayName: string;
  location: string;
  groups: string[];
  macAddress: string;
}

const initialWizardData: WizardData = {
  ipAddress: "",
  username: "pi",
  password: "",
  isNewDevice: false,
  selectedOutput: "",
  selectedResolution: "",
  displayName: "",
  location: "",
  groups: [],
  macAddress: "",
};

// Display outputs will be populated from device detection when available
const availableDisplayOutputs: DisplayOutput[] = [
  { name: "HDMI-0", resolution: "Auto-detect" },
  { name: "HDMI-1", resolution: "Auto-detect" },
];

const stepLabels = ["Connect", "Select", "Configure", "Review"] as const;

function StepIndicator({
  currentStep,
}: {
  readonly currentStep: WizardStep;
}): ReactElement {
  return (
    <div className="flex items-center justify-center gap-0">
      {stepLabels.map((label, index) => {
        const stepNumber = (index + 1) as WizardStep;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <IconCheck className="size-4" /> : stepNumber}
              </div>
              <span
                className={`text-[10px] ${
                  isCurrent
                    ? "font-medium text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {index < stepLabels.length - 1 && (
              <div
                className={`mx-1 mb-4 h-0.5 w-8 ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AddDisplayDialog({
  open,
  onOpenChange,
  onRegister,
}: AddDisplayDialogProps): ReactElement {
  const [step, setStep] = useState<WizardStep>(1);
  const [data, setData] = useState<WizardData>(initialWizardData);
  const [groupInput, setGroupInput] = useState("");

  const handleClose = useCallback(() => {
    setStep(1);
    setData(initialWizardData);
    setGroupInput("");
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNext = useCallback(() => {
    if (step < 4) {
      // Simulate device detection on step 1
      if (step === 1 && data.ipAddress) {
        setData((prev) => ({
          ...prev,
          isNewDevice: true,
        }));
      }
      setStep((prev) => (prev + 1) as WizardStep);
    }
  }, [step, data.ipAddress]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as WizardStep);
    }
  }, [step]);

  const handleRegister = useCallback(() => {
    onRegister({
      name: data.displayName,
      status: "READY",
      location: data.location,
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      displayOutput: data.selectedOutput,
      resolution: data.selectedResolution,
      groups: data.groups,
      nowPlaying: null,
    });
    handleClose();
  }, [data, onRegister, handleClose]);

  const handleAddGroup = useCallback(() => {
    if (groupInput.trim() && !data.groups.includes(groupInput.trim())) {
      setData((prev) => ({
        ...prev,
        groups: [...prev.groups, groupInput.trim()],
      }));
      setGroupInput("");
    }
  }, [groupInput, data.groups]);

  const handleRemoveGroup = useCallback((group: string) => {
    setData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g !== group),
    }));
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return (
          data.ipAddress.length > 0 &&
          (!data.isNewDevice ||
            (data.username.length > 0 && data.password.length > 0))
        );
      case 2:
        return data.selectedOutput.length > 0;
      case 3:
        return data.displayName.length > 0 && data.location.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Add New Display</DialogTitle>
          <DialogDescription>
            Configure a new Raspberry Pi display for your WILDFIRE instance
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <div className="flex flex-col gap-4 py-2">
          {/* Step 1: Connect */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconWifi className="size-4" />
                Connect to Raspberry Pi
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ip-address">IP Address or Hostname</Label>
                <Input
                  id="ip-address"
                  placeholder="192.168.1.105"
                  value={data.ipAddress}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      ipAddress: e.target.value,
                      isNewDevice: e.target.value.length > 0,
                    }))
                  }
                />
              </div>

              {data.isNewDevice && (
                <>
                  <div className="flex flex-col gap-1 rounded-md bg-muted/50 p-3">
                    <p className="text-sm font-medium">New Device Detected</p>
                    <p className="text-xs text-muted-foreground">
                      It looks like you are connecting to a new device. Please
                      enter the device credentials to continue
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={data.username}
                      onChange={(e) =>
                        setData((prev) => ({
                          ...prev,
                          username: e.target.value,
                        }))
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
                        setData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Select Display Output */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconDeviceDesktop className="size-4" />
                Select Display Output
              </div>

              <div
                className="flex flex-col gap-2"
                role="radiogroup"
                aria-label="Display output"
              >
                {availableDisplayOutputs.map((output) => (
                  <button
                    key={output.name}
                    type="button"
                    role="radio"
                    aria-checked={data.selectedOutput === output.name}
                    onClick={() =>
                      setData((prev) => ({
                        ...prev,
                        selectedOutput: output.name,
                        selectedResolution: output.resolution,
                      }))
                    }
                    className={`flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                      data.selectedOutput === output.name
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
                      aria-hidden="true"
                      className={`flex size-5 items-center justify-center rounded-full border-2 ${
                        data.selectedOutput === output.name
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {data.selectedOutput === output.name && (
                        <div className="size-2 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Configure */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconSettings className="size-4" />
                Configure Display
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  placeholder="LB446"
                  value={data.displayName}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="location">Physical Location</Label>
                <Input
                  id="location"
                  placeholder="Bunzel Building - 4th Floor"
                  value={data.location}
                  onChange={(e) =>
                    setData((prev) => ({ ...prev, location: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="groups">Display Groups (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="groups"
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
                </div>
                {data.groups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {data.groups.map((group) => (
                      <Badge
                        key={group}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {group}
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(group)}
                          aria-label={`Remove ${group}`}
                          className="ml-1 rounded-full p-0.5 hover:bg-muted"
                        >
                          <IconX className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconClipboardCheck className="size-4" />
                Review & Register
              </div>

              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex items-start gap-2">
                  <IconDeviceDesktop className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">{data.displayName}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <IconMapPin className="size-3" />
                      {data.location}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-muted-foreground">IP Address:</span>
                  <span>{data.ipAddress}</span>

                  <span className="text-muted-foreground">MAC Address:</span>
                  <span>{data.macAddress}</span>

                  <span className="text-muted-foreground">Display Output:</span>
                  <span>{data.selectedOutput}</span>

                  <span className="text-muted-foreground">Display Groups:</span>
                  <div className="flex flex-wrap gap-1">
                    {data.groups.length > 0 ? (
                      data.groups.map((group) => (
                        <Badge
                          key={group}
                          variant="secondary"
                          className="text-xs"
                        >
                          {group}
                        </Badge>
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
            <Button variant="outline" onClick={handleClose} className="flex-1">
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
      </DialogContent>
    </Dialog>
  );
}
