"use client";

import type { FormEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconFlame } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { AuthApiError } from "@/lib/api-client";

export default function LoginPage(): ReactElement {
  const router = useRouter();
  const { login, isAuthenticated, isInitialized, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    const credentials = { email, password };
    try {
      await login(credentials);
      router.replace("/");
    } catch (err) {
      let message = "Something went wrong.";
      if (err instanceof AuthApiError) {
        if (err.status === 429) {
          message =
            "Too many login attempts. Wait a moment before trying again.";
        } else {
          message = err.message;
        }
      }
      setErrorMessage(message);
    }
  }

  if (!isInitialized) {
    return (
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Redirecting…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="flex flex-col items-center text-center">
        <IconFlame className="size-8 text-primary" stroke={1.5} />
        <h1 className="mt-2 text-xl font-semibold text-primary">
          Welcome to WILDFIRE!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          WILDFIRE — bet you didn&apos;t catch that!
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

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Admin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10! rounded-lg! bg-white! text-sm!"
            autoComplete="current-password"
            required
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-10! w-full rounded-lg! text-sm!"
          disabled={isLoading}
        >
          {isLoading ? "Logging in…" : "Login"}
        </Button>
      </form>
    </div>
  );
}
