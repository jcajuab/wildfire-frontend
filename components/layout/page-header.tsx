interface PageHeaderProps {
  readonly title: string;
  readonly children?: React.ReactNode;
}

export function PageHeader({
  title,
  children,
}: PageHeaderProps): React.ReactElement {
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
