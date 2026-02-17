"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiError, resetPassword } from "@/lib/api-client";

export default function ResetPasswordPage(): ReactElement {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get("token");
    if (queryToken) {
      setToken(queryToken);
    }
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setIsSubmitted(true);
    } catch (err) {
      const message =
        err instanceof AuthApiError ? err.message : "Something went wrong.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold text-primary">
          Complete password reset
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your reset token and choose a new password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {errorMessage ? (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        {isSubmitted ? (
          <p
            className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
            role="status"
          >
            Password reset complete. You can now sign in.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="token">Reset token</Label>
          <Input
            id="token"
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            autoComplete="new-password"
            required
          />
        </div>

        <Button
          type="submit"
          className="h-10! w-full rounded-lg! text-sm!"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Resetting..." : "Reset password"}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}
