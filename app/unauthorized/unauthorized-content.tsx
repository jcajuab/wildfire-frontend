"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export function UnauthorizedContent() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    await logout();
    router.replace("/login");
  }, [logout, router]);

  return (
    <div className="mt-6 flex flex-col gap-3">
      <Button variant="default" onClick={handleLogout} disabled={isLoading}>
        {isLoading ? "Logging out…" : "Log out"}
      </Button>
    </div>
  );
}
