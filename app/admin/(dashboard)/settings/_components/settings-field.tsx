import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingsFieldProps {
  readonly label: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

interface SettingsPanelProps {
  readonly title: string;
  readonly description: string;
  readonly headingId: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
}

export const settingsRowClass =
  "grid grid-cols-1 gap-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-start";
export const settingsLabelClass =
  "pt-2 text-sm font-medium leading-5 text-foreground sm:pr-4";
export const settingsControlClass = "w-full max-w-md";
export const settingsActionControlClass = "w-full max-w-[36rem]";
export const settingsFieldClass = "min-w-0 w-full max-w-md";

export function SettingsField({
  label,
  children,
  className,
}: SettingsFieldProps): ReactElement {
  return (
    <div className={cn(settingsRowClass, className)}>
      <dt className={settingsLabelClass}>{label}</dt>
      <dd className="flex min-w-0 flex-col gap-2">{children}</dd>
    </div>
  );
}

export function SettingsPanel({
  title,
  description,
  headingId,
  children,
  className,
  bodyClassName,
}: SettingsPanelProps): ReactElement {
  return (
    <section aria-labelledby={headingId} className={cn("space-y-4", className)}>
      <header>
        <h2 id={headingId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
