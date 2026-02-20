"use client";

import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthApiError, forgotPassword } from "@/lib/api-client";

export default function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email.trim());
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
        <h1 className="text-xl font-semibold text-primary">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email to request a reset token.
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
            className="status-success-muted rounded-lg px-3 py-2 text-sm"
            role="status"
          >
            If that email exists, a reset token has been issued.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            autoComplete="email"
            required
          />
        </div>

        <Button
          type="submit"
          className="h-10! w-full rounded-lg! text-sm!"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Send reset request"}
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
