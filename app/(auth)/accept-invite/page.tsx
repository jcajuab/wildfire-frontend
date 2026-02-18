"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitation, AuthApiError } from "@/lib/api-client";

const MIN_PASSWORD_LENGTH = 8;

export default function AcceptInvitePage(): ReactElement {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryToken = new URLSearchParams(window.location.search).get("token");
    if (queryToken) {
      setToken(queryToken);
    }
  }, []);

  const passwordTooShort = useMemo(
    () => password.length > 0 && password.length < MIN_PASSWORD_LENGTH,
    [password],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);

    if (passwordTooShort) {
      setErrorMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation({
        token: token.trim(),
        password,
        name: name.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        setErrorMessage("Too many attempts. Please wait and try again.");
      } else {
        setErrorMessage(
          err instanceof AuthApiError ? err.message : "Something went wrong.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-xl font-semibold text-primary">
          Accept invitation
        </h1>
        <p className="text-sm text-muted-foreground">
          Set your display name and password to activate your account.
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
            Invitation accepted. You can now sign in.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="token">Invite token</Label>
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
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
          {isSubmitting ? "Accepting..." : "Accept invitation"}
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
