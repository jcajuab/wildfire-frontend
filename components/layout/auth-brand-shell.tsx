"use client";

import Image from "next/image";
import type { ReactElement, ReactNode } from "react";

import { WildfireLogo } from "@/components/common/wildfire-logo";
import { cn } from "@/lib/utils";

interface AuthBrandShellProps {
  readonly children: ReactNode;
  readonly contentClassName?: string;
}

function BrandLockup({
  compact = false,
}: {
  readonly compact?: boolean;
}): ReactElement {
  return (
    <div
      className={cn("flex min-w-0 items-center", compact ? "gap-3" : "gap-4")}
    >
      <div className="shrink-0 text-primary">
        <WildfireLogo className={compact ? "h-5 w-auto" : "h-7 w-auto"} />
      </div>
      <div className="h-8 w-px shrink-0 bg-border" />
      <div className="shrink-0">
        <Image
          src="/brand/dcism-logo.svg"
          alt="DCISM - Department of Computer, Information Sciences and Mathematics"
          width={514}
          height={128}
          priority
          className={cn("w-auto", compact ? "h-8" : "h-14")}
        />
      </div>
    </div>
  );
}

function DisplayPreview(): ReactElement {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="relative overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/35 px-4 py-3">
          <span className="size-2 rounded-full bg-destructive/70" />
          <span className="size-2 rounded-full bg-warning/80" />
          <span className="size-2 rounded-full bg-success/80" />
          <span className="ml-3 h-2 w-24 rounded-full bg-muted-foreground/15" />
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="aspect-video bg-primary/10 p-3">
                <div className="flex h-full flex-col justify-between rounded border border-primary/15 bg-background/80 p-3">
                  <div className="flex items-center justify-between">
                    <span className="h-2 w-20 rounded-full bg-primary/25" />
                    <span className="h-2 w-10 rounded-full bg-muted-foreground/15" />
                  </div>
                  <div className="space-y-2">
                    <span className="block h-3 w-28 rounded-full bg-foreground/20" />
                    <span className="block h-2 w-40 rounded-full bg-muted-foreground/20" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Displays", "Content", "Schedules"].map((label) => (
                <div
                  key={label}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <span className="block h-1.5 w-10 rounded-full bg-primary/20" />
                  <span className="mt-2 block text-[11px] font-medium text-muted-foreground">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            {[
              ["Now", "Department notice"],
              ["10:30", "Lab schedule"],
              ["12:00", "Faculty update"],
              ["15:45", "Event reminder"],
            ].map(([time, title], index) => (
              <div
                key={title}
                className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 rounded-md bg-muted/35 px-3 py-2"
              >
                <span className="text-[11px] font-medium text-primary">
                  {time}
                </span>
                <span className="min-w-0 truncate text-xs text-foreground">
                  {title}
                </span>
                {index === 0 ? (
                  <span className="col-span-2 h-1 rounded-full bg-primary/40" />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandPanel(): ReactElement {
  return (
    <aside className="relative hidden overflow-hidden border-l border-border bg-muted/20 lg:flex lg:flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-10 p-12">
        <BrandLockup />

        <DisplayPreview />

        <div className="max-w-lg space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Department-wide digital signage system
          </p>
          <p className="text-3xl font-semibold leading-tight tracking-tight text-foreground text-balance">
            Plan, schedule, and publish department announcements from one quiet
            workspace.
          </p>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Built for DCISM display operations with focused tools for content,
            playlists, schedules, and registered screens.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AuthBrandShell({
  children,
  contentClassName,
}: AuthBrandShellProps): ReactElement {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(28rem,0.88fr)_minmax(34rem,1.12fr)]">
      <section className="flex min-h-svh items-center justify-center overflow-auto px-6 py-8 sm:px-10 lg:px-12">
        <main
          id="main-content"
          className={cn("w-full max-w-md", contentClassName)}
        >
          <div className="mb-8 space-y-3 lg:hidden">
            <BrandLockup compact />
            <p className="text-sm text-muted-foreground">
              Department-wide digital signage system
            </p>
          </div>
          {children}
        </main>
      </section>
      <BrandPanel />
    </div>
  );
}
