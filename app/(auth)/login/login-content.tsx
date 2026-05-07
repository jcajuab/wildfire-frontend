"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { AuthApiError } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { purgeStaleSession, refreshAccessToken } from "@/lib/auth-session";
import { can as canPermission } from "@/lib/permissions";
import {
  getFirstPermittedAdminRoute,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import type { AuthResponse } from "@/types/auth";

// Use a hard navigation on the post-login redirect so the Next.js Router
// Cache cannot replay a previous user's RSC payload to the next user.
function defaultPostLoginNavigator(target: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(target);
}

let navigateToPostLogin = defaultPostLoginNavigator;

export function setPostLoginNavigatorForTest(
  navigator: ((target: string) => void) | null,
): void {
  navigateToPostLogin = navigator ?? defaultPostLoginNavigator;
}

function getPostLoginRedirectFromResponse(
  response: AuthResponse,
  redirectTo: string | null,
): string {
  if (redirectTo != null && redirectTo.length > 0) {
    return redirectTo;
  }

  const hasPermission = (permission: Parameters<typeof canPermission>[0]) =>
    canPermission(permission, response.permissions, response.user.isAdmin);

  return getFirstPermittedAdminRoute(hasPermission) ?? UNAUTHORIZED_ROUTE;
}

export function LoginContent(): ReactElement | null {
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isInitialized, can } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledRedirectRef = useRef<string | null>(null);
  const redirectTo = searchParams.get("redirectTo");
  const postLoginRedirect =
    redirectTo ?? getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE;

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) {
      handledRedirectRef.current = null;
      return;
    }

    if (isLoggingIn) {
      return;
    }

    const redirectKey = `${redirectTo ?? "__default__"}::${postLoginRedirect}`;
    if (handledRedirectRef.current === redirectKey) {
      return;
    }
    handledRedirectRef.current = redirectKey;

    // Server sent us here, but client memory may still hold a stale session.
    // Refresh from the cookie before redirecting an already-authenticated user.
    if (redirectTo != null && redirectTo.length > 0) {
      let cancelled = false;
      void refreshAccessToken()
        .then(() => {
          if (!cancelled) {
            navigateToPostLogin(postLoginRedirect);
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

    navigateToPostLogin(postLoginRedirect);
  }, [
    isInitialized,
    isAuthenticated,
    isLoggingIn,
    redirectTo,
    postLoginRedirect,
  ]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);
    const credentials = { username, password };
    try {
      const response = await login(credentials);
      navigateToPostLogin(
        getPostLoginRedirectFromResponse(response, redirectTo),
      );
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
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
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
          {isLoggingIn ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
