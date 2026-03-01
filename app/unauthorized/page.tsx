import type { ReactElement } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function UnauthorizedPage(): ReactElement {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border bg-card px-8 py-10 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No modules assigned
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account does not currently have access to any admin modules.
          Contact your administrator to assign the required permissions.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button asChild variant="default">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
