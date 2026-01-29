"use client";

import { PageHeader } from "@/components/layout";

export default function LogsPage(): React.ReactElement {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Logs" />

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-lg font-semibold">Activity Logs</h2>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Logs page coming soon...</p>
        </div>
      </div>
    </div>
  );
}
