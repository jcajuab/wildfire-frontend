import type { Metadata } from "next";
import { Geist_Mono, Source_Sans_3 } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import StoreProvider from "@/lib/StoreProvider";
import "./globals.css";

const sourceSans = Source_Sans_3({
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
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sourceSans.variable}>
      <body className={`${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to Main Content
        </a>
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
