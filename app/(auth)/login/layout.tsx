import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to WILDFIRE digital signage dashboard.",
};

/** Login has no server data; keep the segment static for fast first paint. */
export const dynamic = "force-static";

export default function Layout({ children }: { readonly children: ReactNode }) {
  return children;
}
