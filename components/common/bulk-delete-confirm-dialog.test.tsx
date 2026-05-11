import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { BulkDeleteConfirmDialog } from "@/components/common/bulk-delete-confirm-dialog";

const notifyApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/get-api-error-message", () => ({
  notifyApiError: notifyApiErrorMock,
}));

const selectedLabels = [
  "Auditorium Annex 004",
  "Auditorium Annex 076",
  "Auditorium Annex 096",
  "Auditorium East 022",
  "Auditorium East 035",
  "Auditorium West 011",
];

describe("BulkDeleteConfirmDialog", () => {
  test("renders a compact selected item list without overflow summary text", () => {
    render(
      <BulkDeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        selectedLabels={selectedLabels}
        title="Unregister selected displays?"
        itemName="display"
        itemNamePlural="displays"
        confirmLabel="Unregister 6 displays"
        actionDescription="This will disconnect and revoke runtime authentication for"
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "Unregister selected displays?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This will disconnect and revoke runtime authentication for 6 displays. This action cannot be undone.",
      ),
    ).toBeInTheDocument();
    for (const label of selectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });

  test("confirms and closes on success", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <BulkDeleteConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        selectedLabels={["Campus Alert 474"]}
        title="Delete selected content?"
        itemName="content item"
        itemNamePlural="content items"
        confirmLabel="Delete 1 content item"
        actionDescription="This will permanently delete"
        onConfirm={onConfirm}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete 1 content item" }),
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("keeps the dialog open and reports errors on failure", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const error = new Error("Request failed");

    render(
      <BulkDeleteConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        selectedLabels={["Morning Loop 100"]}
        title="Delete selected playlists?"
        itemName="playlist"
        itemNamePlural="playlists"
        confirmLabel="Delete 1 playlist"
        actionDescription="This will permanently delete"
        onConfirm={vi.fn().mockRejectedValue(error)}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete 1 playlist" }));

    await waitFor(() => {
      expect(notifyApiErrorMock).toHaveBeenCalledWith(
        error,
        "Failed to complete bulk delete.",
        {
          dedupe: false,
          id: "wildfire:bulk-confirm-action",
        },
      );
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
