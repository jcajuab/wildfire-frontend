import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to WILDFIRE digital signage dashboard.",
};

export default function Layout({ children }: { readonly children: ReactNode }) {
  return children;
}
