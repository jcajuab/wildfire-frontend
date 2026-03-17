import type { ReactElement, ReactNode } from "react";

interface SettingsFieldProps {
  readonly label: string;
  readonly children: ReactNode;
}

export function SettingsField({
  label,
  children,
}: SettingsFieldProps): ReactElement {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] md:items-start">
      <dt className="pt-2 text-sm font-medium text-foreground">{label}</dt>
      <dd className="flex min-w-0 flex-col gap-2">{children}</dd>
    </div>
  );
}
