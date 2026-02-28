"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconShieldLock } from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { getRequiredReadPermission } from "@/lib/route-permissions";

interface PageReadGuardProps {
  readonly children: ReactNode;
}

/**
 * Wraps dashboard content and shows an access-denied view when the user
 * navigates to a resource route without the required read permission.
 */
export function PageReadGuard({ children }: PageReadGuardProps): ReactElement {
  const pathname = usePathname();
  const { can, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          title="Checking access"
          description="Verifying permissions for this page."
          icon={null}
          action={null}
        />
      </div>
    );
  }

  const requiredPermission = getRequiredReadPermission(pathname ?? "");
  const hasAccess =
    requiredPermission === null ? true : can(requiredPermission);

  if (!hasAccess && requiredPermission !== null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          title="You don't have access to this page"
          description="You need permission to view this section. Go back to the dashboard or contact your administrator."
          icon={<IconShieldLock className="size-12 text-muted-foreground" />}
          action={
            <Button asChild variant="default">
              <Link href="/admin/displays">Go to dashboard</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
