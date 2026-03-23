import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Accept Invitation",
  description: "Accept your invitation to join WILDFIRE.",
};

export default function Layout({ children }: { readonly children: ReactNode }) {
  return children;
}
