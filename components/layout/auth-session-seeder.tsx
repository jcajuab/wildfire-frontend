"use client";

import { useLayoutEffect } from "react";

import { seedAuthSession } from "@/lib/auth-session";
import type { AuthResponse } from "@/types/auth";

interface AuthSessionSeederProps {
  readonly session: AuthResponse | null;
}

export function AuthSessionSeeder({ session }: AuthSessionSeederProps): null {
  useLayoutEffect(() => {
    if (session === null) {
      return;
    }

    seedAuthSession(session);
  }, [session]);

  return null;
}
