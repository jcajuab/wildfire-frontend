import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          No modules available
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account is authenticated, but no dashboard route is assigned yet.
          Contact your administrator to request access.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </main>
  );
}
