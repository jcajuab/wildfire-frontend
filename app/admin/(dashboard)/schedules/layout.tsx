import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Schedules",
};

export default function Layout({ children }: { readonly children: ReactNode }) {
  return children;
}
