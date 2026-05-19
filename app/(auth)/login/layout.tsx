import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to the WILDFIRE department-wide signage dashboard.",
};

export default function Layout({ children }: { readonly children: ReactNode }) {
  return children;
}
