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
  getRequiredReadPermission,
  UNAUTHORIZED_ROUTE,
} from "@/lib/route-permissions";
import type { AuthResponse } from "@/types/auth";

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
  const hasPermission = (permission: Parameters<typeof canPermission>[0]) =>
    canPermission(permission, response.permissions, response.user.isAdmin);

  if (redirectTo != null && redirectTo.length > 0) {
    const required = getRequiredReadPermission(redirectTo);
    if (required === null || hasPermission(required)) {
      return redirectTo;
    }
  }

  return getFirstPermittedAdminRoute(hasPermission) ?? UNAUTHORIZED_ROUTE;
}

export function LoginContent(): ReactElement | null {
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isInitialized, can } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const didLoginHere = useRef(false);
  const didRedirect = useRef(false);
  const redirectTo = searchParams.get("redirectTo");

  // §4: Mount-only external sync — redirect users who arrive already authenticated.
  // Does NOT handle post-login navigation (that is handleSubmit's responsibility per §3).
  useEffect(() => {
    if (didLoginHere.current || didRedirect.current) return;
    if (!isInitialized || !isAuthenticated) return;

    didRedirect.current = true;

    if (redirectTo != null && redirectTo.length > 0) {
      let cancelled = false;
      void refreshAccessToken()
        .then(() => {
          if (!cancelled) navigateToPostLogin(redirectTo);
        })
        .catch(async (err: unknown) => {
          if (cancelled) return;
          if (err instanceof AuthApiError && err.status === 401) {
            await purgeStaleSession();
          }
        });
      return () => {
        cancelled = true;
      };
    }

    const target = getFirstPermittedAdminRoute(can) ?? UNAUTHORIZED_ROUTE;
    navigateToPostLogin(target);
  }, [isInitialized, isAuthenticated, redirectTo, can]);

  // §3: User-driven login — handle redirect entirely in the event handler.
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoggingIn(true);
    const credentials = { username, password };
    try {
      didLoginHere.current = true;
      const response = await login(credentials);
      navigateToPostLogin(
        getPostLoginRedirectFromResponse(response, redirectTo),
      );
    } catch (err) {
      didLoginHere.current = false;
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
