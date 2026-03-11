"use client";

import type { ReactElement } from "react";
import { IconCheck } from "@tabler/icons-react";

type WizardStep = 1 | 2 | 3 | 4;

const stepLabels = ["Connect", "Select", "Configure", "Review"] as const;

interface StepIndicatorProps {
  readonly currentStep: WizardStep;
}

export function StepIndicator({
  currentStep,
}: StepIndicatorProps): ReactElement {
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
                className={`text-xs ${
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
