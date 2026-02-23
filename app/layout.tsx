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
        <a href="#main-content" className="skip-link">
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
