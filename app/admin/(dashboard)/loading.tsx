import type { ReactElement } from "react";

export default function Loading(): ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="flex-1 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
