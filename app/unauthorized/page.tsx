import type { ReactElement } from "react";
import type { Metadata } from "next";
import { UnauthorizedContent } from "./unauthorized-content";

export const metadata: Metadata = {
  title: "Unauthorized",
  description: "You do not have permission to access this page.",
  robots: { index: false, follow: false },
};

export default function UnauthorizedPage(): ReactElement {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card px-8 py-10">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No modules assigned
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account does not currently have access to any admin modules.
          Contact your administrator to assign the required permissions.
        </p>
        <UnauthorizedContent />
      </div>
    </div>
  );
}
