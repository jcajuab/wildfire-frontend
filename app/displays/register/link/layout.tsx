import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

export const metadata: Metadata = {
  title: "Display Registration",
};

export default function Layout({ children }: { readonly children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
