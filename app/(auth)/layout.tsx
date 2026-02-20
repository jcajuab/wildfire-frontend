import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="grid min-h-screen bg-white md:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </section>
      <aside className="hidden bg-primary p-10 text-primary-foreground md:flex md:flex-col md:justify-end">
        <div className="space-y-4">
          <p className="max-w-md text-4xl font-semibold leading-tight">
            WILDFIRE is your campus digital signage platform
          </p>
          <p className="max-w-md text-lg text-primary-foreground/80">
            Plan content, publish schedules, and keep every screen in sync
          </p>
        </div>
      </aside>
    </div>
  );
}
