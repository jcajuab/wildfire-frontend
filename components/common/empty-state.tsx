"use client";

import type { ReactElement, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps): ReactElement {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion ? undefined : { duration: 0.16, ease: "easeOut" }
      }
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/20 px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <h3 className="text-xl font-semibold text-balance">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </motion.div>
  );
}
