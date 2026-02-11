import type { ReactElement, ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

interface DashboardPageRootProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function DashboardPageRoot({
  children,
  className,
}: DashboardPageRootProps): ReactElement {
  return (
    <div className={cn("flex h-full min-w-0 flex-col", className)}>
      {children}
    </div>
  );
}

interface DashboardPageHeaderProps {
  readonly title: string;
  readonly actions?: ReactNode;
}

function DashboardPageHeader({
  title,
  actions,
}: DashboardPageHeaderProps): ReactElement {
  return <PageHeader title={title}>{actions}</PageHeader>;
}

interface DashboardPageBannerProps {
  readonly children: ReactNode;
  readonly tone?: "info" | "danger";
  readonly className?: string;
}

function DashboardPageBanner({
  children,
  tone = "info",
  className,
}: DashboardPageBannerProps): ReactElement {
  return (
    <div
      className={cn(
        "mx-8 mt-2 rounded-lg border px-4 py-2.5 text-sm",
        tone === "info" && "border-primary/30 bg-primary/10 text-primary",
        tone === "danger" &&
          "border-destructive/50 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DashboardPageToolbarProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function DashboardPageToolbar({
  children,
  className,
}: DashboardPageToolbarProps): ReactElement {
  return (
    <section
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-8 py-3",
        className,
      )}
    >
      {children}
    </section>
  );
}

interface DashboardPageBodyProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function DashboardPageBody({
  children,
  className,
}: DashboardPageBodyProps): ReactElement {
  return (
    <section className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {children}
    </section>
  );
}

interface DashboardPageContentProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function DashboardPageContent({
  children,
  className,
}: DashboardPageContentProps): ReactElement {
  return (
    <div className={cn("flex-1 overflow-auto px-8 pb-8", className)}>
      {children}
    </div>
  );
}

interface DashboardPageFooterProps {
  readonly children: ReactNode;
  readonly className?: string;
}

function DashboardPageFooter({
  children,
  className,
}: DashboardPageFooterProps): ReactElement {
  return (
    <footer className={cn("border-t border-border/70", className)}>
      {children}
    </footer>
  );
}

export const DashboardPage = {
  Root: DashboardPageRoot,
  Header: DashboardPageHeader,
  Banner: DashboardPageBanner,
  Toolbar: DashboardPageToolbar,
  Body: DashboardPageBody,
  Content: DashboardPageContent,
  Footer: DashboardPageFooter,
} as const;
