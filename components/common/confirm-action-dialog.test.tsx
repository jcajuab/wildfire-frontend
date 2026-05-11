import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";

const notifyApiErrorMock = vi.hoisted(() => vi.fn(() => "Request failed"));

vi.mock("@/lib/api/get-api-error-message", () => ({
  notifyApiError: notifyApiErrorMock,
}));

describe("ConfirmActionDialog", () => {
  test("renders a singular destructive confirmation", () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete content?"
        description='This will permanently delete "Safety Advisory 442".'
        confirmLabel="Delete content"
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("alertdialog", { name: "Delete content?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This will permanently delete "Safety Advisory 442".'),
    ).toHaveClass("text-pretty");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete content" }),
    ).toHaveAttribute("data-variant", "destructive");
  });

  test("confirms and closes on success", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Delete playlist?"
        description='This will permanently delete "Main Hall 064".'
        confirmLabel="Delete playlist"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete playlist" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  test("keeps the dialog open and reports errors on failure", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onError = vi.fn();
    const error = new Error("Delete failed");

    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Unregister display?"
        description='This will disconnect "Auditorium Annex 076".'
        confirmLabel="Unregister Display"
        errorFallback="Failed to unregister display."
        onConfirm={vi.fn().mockRejectedValue(error)}
        onError={onError}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Unregister Display" }),
    );

    await waitFor(() => {
      expect(notifyApiErrorMock).toHaveBeenCalledWith(
        error,
        "Failed to unregister display.",
        {
          dedupe: false,
          id: "wildfire:confirm-action",
        },
      );
      expect(onError).toHaveBeenCalledWith("Request failed");
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  test("supports non-destructive confirmations", () => {
    render(
      <ConfirmActionDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Clear credentials?"
        description="This removes the saved credentials."
        confirmLabel="Clear"
        destructive={false}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Clear" })).toHaveAttribute(
      "data-variant",
      "default",
    );
  });
});
