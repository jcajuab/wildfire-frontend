import type { ReactElement, ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps): ReactElement {
  return (
    <header className="flex flex-col gap-2 border-b border-border bg-muted/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <h1 className="text-xl font-semibold leading-tight tracking-tight text-balance sm:text-2xl">
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
