import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AuthBrandShell } from "@/components/layout/auth-brand-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AuthBrandShell>
      <Suspense fallback={null}>{children}</Suspense>
    </AuthBrandShell>
  );
}
