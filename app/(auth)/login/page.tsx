import { Suspense, type ReactElement } from "react";
import { LoginContent } from "./login-content";

export default function LoginPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="w-full">
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
