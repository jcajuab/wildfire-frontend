"use client";

import type { FormEvent, ReactElement } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { AuthApiError } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { purgeStaleSession, refreshAccessToken } from "@/lib/auth-session";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";

function LoginForm(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isInitialized, can } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = searchParams.get("redirectTo");
  const postLoginRedirect =
    redirectTo ?? getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE;

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) {
      return;
    }

    // Server sent us here (e.g. RSC redirect) but client may still hold a stale
    // in-memory session. Force a cookie-based refresh before redirecting;
    // bootstrapAccessToken skips refresh when an access token already exists.
    if (redirectTo != null && redirectTo.length > 0) {
      let cancelled = false;
      void refreshAccessToken()
        .then(() => {
          if (!cancelled) {
            router.replace(postLoginRedirect);
          }
        })
        .catch(async (err: unknown) => {
          if (cancelled) {
            return;
          }
          if (err instanceof AuthApiError && err.status === 401) {
            await purgeStaleSession();
          }
        });
      return () => {
        cancelled = true;
      };
    }

    router.replace(postLoginRedirect);
  }, [isInitialized, isAuthenticated, redirectTo, postLoginRedirect, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);
    const credentials = { username, password };
    try {
      await login(credentials);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 429) {
        setErrorMessage(
          "Too many login attempts. Wait a moment before trying again.",
        );
      } else {
        setErrorMessage(getApiErrorMessage(err, "Something went wrong."));
      }
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (!isInitialized) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Redirecting…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Login
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back to WILDFIRE
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {errorMessage !== null && (
          <p
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Admin"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 rounded-lg text-sm"
            autoComplete="username"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="********"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg text-sm"
            autoComplete="current-password"
            required
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-lg text-sm"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? "Logging in…" : "Login"}
        </Button>
      </form>
    </div>
  );
}

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
      <LoginForm />
    </Suspense>
  );
}
