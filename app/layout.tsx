import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import StoreProvider from "@/lib/StoreProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "WILDFIRE",
  description: "Digital Signage Management Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-semibold focus-visible:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Skip to Main Content
        </a>
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
