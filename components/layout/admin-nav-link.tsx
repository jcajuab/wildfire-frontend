"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactElement } from "react";
import { useCallback } from "react";

export type AdminNavLinkProps = Omit<ComponentProps<typeof Link>, "prefetch">;

function hrefToPrefetchPath(href: AdminNavLinkProps["href"]): string {
  if (typeof href === "string") return href;
  const pathname = href.pathname;
  return typeof pathname === "string" ? pathname : "";
}

/**
 * Admin navigation: disables viewport/idle prefetch; prefetches the route on
 * hover and keyboard focus only.
 */
export function AdminNavLink({
  href,
  onMouseEnter,
  onFocus,
  ...rest
}: AdminNavLinkProps): ReactElement {
  const router = useRouter();
  const prefetchRoute = useCallback(() => {
    const path = hrefToPrefetchPath(href);
    if (path !== "") router.prefetch(path);
  }, [router, href]);

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      onMouseEnter={(e) => {
        prefetchRoute();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetchRoute();
        onFocus?.(e);
      }}
    />
  );
}
