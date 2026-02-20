import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/auth-context";
import StoreProvider from "@/lib/StoreProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en" className={geistSans.variable}>
      <body className={`${geistMono.variable} antialiased`}>
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
