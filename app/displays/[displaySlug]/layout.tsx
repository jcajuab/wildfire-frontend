import type { ReactNode } from "react";

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return (
    <div data-force-light className="h-screen w-screen">
      {children}
    </div>
  );
}
