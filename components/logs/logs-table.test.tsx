import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { LogsTable } from "./logs-table";
import type { LogEntry } from "@/types/log";

vi.mock("next/image", () => ({
  default: (
    props: React.ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const { fill, unoptimized, ...imgProps } = props;
    void fill;
    void unoptimized;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img {...imgProps} alt={imgProps.alt ?? ""} />
    );
  },
}));

const logs: readonly LogEntry[] = [
  {
    id: "log-1",
    occurredAt: "2026-05-09T12:30:00.000Z",
    actorId: "user-1",
    actorName: "Admin",
    actorAvatarUrl: null,
    description: "Updated a role",
    technicalDescription: "PATCH /roles/role-1 returned 200",
    metadata: {
      requestId: "req-1",
      route: "/roles/:id",
    },
    rawMetadata: {
      requestId: "req-1",
      route: "/roles/:id",
      userAgent: "Vitest",
    },
  },
];

describe("LogsTable", () => {
  test("renders admin table anatomy for populated logs", () => {
    render(<LogsTable logs={logs} />);

    expect(screen.getAllByRole("rowgroup")).toHaveLength(2);
    expect(screen.getByRole("columnheader", { name: "Timestamp" })).toHaveClass(
      "w-[220px]",
    );
    expect(screen.getByRole("columnheader", { name: "Actions" })).toHaveClass(
      "w-[48px]",
      "text-right",
    );

    const header = screen
      .getByRole("columnheader", { name: "Timestamp" })
      .closest("thead");
    expect(header).toHaveClass("sticky", "top-0", "z-10", "bg-background");

    const body = screen.getAllByRole("rowgroup")[1];
    expect(body).toHaveClass("[&_tr:last-child]:border-b");

    const row = screen.getAllByRole("row")[1];
    expect(row).toHaveClass("h-12");
    expect(screen.getByText(/May/).closest("td")).toHaveClass("tabular-nums");
  });

  test("shows metadata as text and opens metadata dialog from row actions", async () => {
    const actor = userEvent.setup();
    render(<LogsTable logs={logs} />);

    expect(
      screen.queryByRole("button", { name: "View full metadata" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/requestId/)).toHaveClass("font-mono");

    await actor.click(
      screen.getByRole("button", { name: "Actions for log log-1" }),
    );
    await actor.click(screen.getByRole("menuitem", { name: "View Metadata" }));

    expect(
      screen.getByRole("heading", { name: "Request Metadata" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("dialog")).getByText(
        "PATCH /roles/role-1 returned 200",
      ),
    ).toBeVisible();
  });

  test("renders empty state inside the table region", () => {
    render(
      <LogsTable
        logs={[]}
        emptyDescription="No audit log entries match the current filters."
      />,
    );

    expect(
      screen.getByRole("columnheader", { name: "Timestamp" }),
    ).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Author" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Description" }),
    ).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Metadata" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No logs found" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No logs found" }).closest("tr"),
    ).toHaveClass("border-0", "hover:bg-transparent");
    expect(
      screen.getByRole("heading", { name: "No logs found" }).closest("div"),
    ).toHaveClass("border-0", "bg-transparent");
    expect(
      screen.getByText("No audit log entries match the current filters."),
    ).toBeVisible();
  });
});
