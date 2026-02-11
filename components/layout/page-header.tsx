import type { ReactElement, ReactNode } from "react";

interface PageHeaderProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps): ReactElement {
  return (
    <header className="flex items-center justify-between border-b border-border/70 px-8 py-4">
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
        {title}
      </h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
