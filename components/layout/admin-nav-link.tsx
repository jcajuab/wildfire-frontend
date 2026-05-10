"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentProps, ReactElement } from "react";
import { useCallback, useRef } from "react";

export type AdminNavLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;
const PREFETCH_DELAY_MS = 120;

interface NetworkConnectionLike {
  readonly effectiveType?: string;
  readonly saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkConnectionLike;
}

function hrefToPrefetchPath(href: AdminNavLinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname;
  return typeof pathname === "string" ? pathname : "";
}

function shouldSkipPrefetchForConnection(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const connection = (navigator as NavigatorWithConnection).connection;
  if (connection == null) {
    return false;
  }

  if (connection.saveData === true) {
    return true;
  }

  const effectiveType = connection.effectiveType?.toLowerCase() ?? "";
  return effectiveType.includes("2g") || effectiveType.includes("3g");
}

/**
 * Admin navigation: disables viewport/idle prefetch; prefetches the route on
 * hover and keyboard focus only.
 */
export function AdminNavLink({
  href,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: AdminNavLinkProps): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const prefetchTimeoutRef = useRef<number | null>(null);

  const cancelPrefetch = useCallback(() => {
    if (prefetchTimeoutRef.current !== null) {
      window.clearTimeout(prefetchTimeoutRef.current);
      prefetchTimeoutRef.current = null;
    }
  }, []);

  const prefetchRoute = useCallback(() => {
    const path = hrefToPrefetchPath(href);
    if (path === "" || path === pathname || shouldSkipPrefetchForConnection()) {
      return;
    }

    cancelPrefetch();
    prefetchTimeoutRef.current = window.setTimeout(() => {
      prefetchTimeoutRef.current = null;
      router.prefetch(path);
    }, PREFETCH_DELAY_MS);
  }, [cancelPrefetch, router, href, pathname]);

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        prefetchRoute();
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        cancelPrefetch();
        onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        prefetchRoute();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        cancelPrefetch();
        onBlur?.(e);
      }}
    />
  );
}
