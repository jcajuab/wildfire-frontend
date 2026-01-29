"use client";

import { useState } from "react";
import { IconFlame } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    // TODO: Implement login logic
    console.log("Login attempt:", { email, password });
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
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Admin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="!h-10 !rounded-lg !bg-white !text-sm"
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
            className="!h-10 !rounded-lg !bg-white !text-sm"
          />
        </div>

        <Button type="submit" className="!h-10 w-full !rounded-lg !text-sm">
          Login
        </Button>
      </form>
    </div>
  );
}
