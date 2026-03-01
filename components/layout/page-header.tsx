import type { ReactElement, ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps): ReactElement {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-6 py-4 sm:px-8">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-balance sm:text-3xl">
        {title}
      </h1>
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </header>
  );
}
