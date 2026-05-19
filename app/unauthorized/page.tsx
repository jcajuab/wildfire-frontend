import type { ReactElement } from "react";
import type { Metadata } from "next";
import { AuthBrandShell } from "@/components/layout/auth-brand-shell";
import { UnauthorizedContent } from "./unauthorized-content";

export const metadata: Metadata = {
  title: "Unauthorized",
  description: "You do not have permission to access this page.",
  robots: { index: false, follow: false },
};

export default function UnauthorizedPage(): ReactElement {
  return (
    <AuthBrandShell>
      <div className="rounded-md border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            No modules assigned
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Your account does not currently have access to any admin modules.
            Contact your administrator to assign the required permissions.
          </p>
        </div>
        <UnauthorizedContent />
      </div>
    </AuthBrandShell>
  );
}
