import type { ReactElement, ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps): ReactElement {
  return (
    <header className="flex flex-col gap-2 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold leading-tight tracking-tight text-balance">
        {title}
      </h1>
      {children && (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          {children}
        </div>
      )}
    </header>
  );
}
