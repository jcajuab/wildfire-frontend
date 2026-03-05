import type { ReactElement, ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps): ReactElement {
  return (
    <header className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      {children && (
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {children}
        </div>
      )}
    </header>
  );
}
