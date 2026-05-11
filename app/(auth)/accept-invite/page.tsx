"use client";

import { Suspense } from "react";
import type { FormEvent, ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredLabel } from "@/components/common/required-label";
import { acceptInvitation, AuthApiError } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";

const MIN_PASSWORD_LENGTH = 8;

function AcceptInvitePageBody(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryToken = searchParams.get("token");
    if (queryToken) {
      setToken(queryToken);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isSubmitted) return;

    setRedirectCountdown(5);
    const interval = window.setInterval(() => {
      setRedirectCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          router.replace("/login");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isSubmitted, router]);

  const passwordTooShort = useMemo(
    () => password.length > 0 && password.length < MIN_PASSWORD_LENGTH,
    [password],
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    const trimmedToken = token.trim();

    if (passwordTooShort) {
      setErrorMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
      return;
    }
    if (trimmedToken.length === 0) {
      setErrorMessage(
        "This invitation link is missing its token. Request a new invitation link from an administrator.",
      );
      return;
    }
    if (username.trim().length === 0) {
      setErrorMessage("Username is required.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await acceptInvitation({
        token: trimmedToken,
        password,
        username: username.trim(),
        name: name.trim() || undefined,
      });
      setIsSubmitted(true);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        setErrorMessage("Too many attempts. Please wait and try again.");
      } else {
        setErrorMessage(getApiErrorMessage(err, "Something went wrong."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Accept invitation
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete your account setup to access WILDFIRE.
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
            className="rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]"
            role="status"
          >
            Invitation accepted. Redirecting to login in {redirectCountdown}{" "}
            {redirectCountdown === 1 ? "second" : "seconds"}.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            name="name"
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-lg text-sm"
            placeholder="Enter your full name"
            disabled={isSubmitted}
          />
        </div>

        <div className="space-y-2">
          <RequiredLabel htmlFor="username">Username</RequiredLabel>
          <Input
            id="username"
            type="text"
            value={username}
            name="username"
            onChange={(event) => setUsername(event.target.value)}
            className="h-11 rounded-lg text-sm"
            placeholder="Choose a username"
            autoComplete="username"
            disabled={isSubmitted}
            required
          />
        </div>

        <div className="space-y-2">
          <RequiredLabel htmlFor="password">Password</RequiredLabel>
          <Input
            id="password"
            type="password"
            value={password}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-lg text-sm"
            placeholder="Create a password"
            autoComplete="new-password"
            disabled={isSubmitted}
            required
          />
        </div>

        <div className="space-y-2">
          <RequiredLabel htmlFor="confirmPassword">
            Confirm password
          </RequiredLabel>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-11 rounded-lg text-sm"
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={isSubmitted}
            required
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg text-sm"
          disabled={isSubmitting || isSubmitted}
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

function AcceptInvitePageShell(): ReactElement {
  return (
    <div className="w-full">
      <AcceptInvitePageBody />
    </div>
  );
}

export default function AcceptInvitePage(): ReactElement {
  return (
    <Suspense
      fallback={<div className="rounded-lg bg-muted px-3 py-2">Loading...</div>}
    >
      <AcceptInvitePageShell />
    </Suspense>
  );
}
