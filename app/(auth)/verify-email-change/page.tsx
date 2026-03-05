"use client";

import { Suspense, useMemo } from "react";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthApiError, verifyEmailChangeToken } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";

function VerifyEmailChangePageBody(): ReactElement {
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const queryToken = searchParams.get("token")?.trim();
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  const canSubmit = useMemo(
    () => token.trim().length > 0 && !isSubmitting,
    [isSubmitting, token],
  );

  const handleVerify = async (): Promise<void> => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    setStatus("idle");
    try {
      await verifyEmailChangeToken(token.trim());
      await refreshSession().catch(() => undefined);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof AuthApiError
          ? err.message
          : "Unable to verify email change. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Verify email change
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm your new email address to complete the change.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {status === "error" && errorMessage ? (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {status === "success" ? (
          <p
            className="rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]"
            role="status"
          >
            Email verified. Your account email has been updated.
          </p>
        ) : null}

        <Button
          type="button"
          className="h-11 w-full rounded-lg text-sm"
          disabled={!canSubmit}
          onClick={() => void handleVerify()}
        >
          {isSubmitting ? "Verifying..." : "Verify email"}
        </Button>

        <div className="text-center">
          <Link
            href="/admin/settings"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Back to settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailChangePageContent(): ReactElement {
  return <VerifyEmailChangePageBody />;
}

export default function VerifyEmailChangePage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg bg-muted px-3 py-2">
          Loading verification...
        </div>
      }
    >
      <VerifyEmailChangePageContent />
    </Suspense>
  );
}
