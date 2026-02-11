import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fc]">
      {children}
    </div>
  );
}
