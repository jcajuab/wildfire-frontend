import { useState, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AddDisplayDialog } from "@/components/displays/add-display-dialog";

function AddDisplayDialogHarness(): ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <AddDisplayDialog
        open={open}
        onOpenChange={setOpen}
        onRegister={vi.fn()}
        existingGroups={[]}
      />
    </>
  );
}

async function dismissDialog(
  mode: "overlay" | "escape",
  user: ReturnType<typeof userEvent.setup>,
) {
  if (mode === "escape") {
    await user.keyboard("{Escape}");
  } else {
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    expect(overlay).toBeTruthy();
    fireEvent.pointerDown(overlay as Element);
    fireEvent.click(overlay as Element);
  }

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
}

describe("AddDisplayDialog", () => {
  test("supports keyboard navigation for display output radios", async () => {
    const user = userEvent.setup();

    render(
      <AddDisplayDialog
        open={true}
        onOpenChange={vi.fn()}
        onRegister={vi.fn()}
        existingGroups={[]}
      />,
    );

    await user.type(
      screen.getByLabelText("IP Address or Hostname"),
      "10.0.0.8",
    );
    await user.type(screen.getByLabelText("Password"), "raspberry");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    const group = screen.getByRole("radiogroup", { name: "Display output" });
    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(screen.getByRole("radio", { name: /HDMI-0/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.keyDown(group, { key: "End" });
    expect(screen.getByRole("radio", { name: /HDMI-1/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.keyDown(group, { key: "Home" });
    expect(screen.getByRole("radio", { name: /HDMI-0/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }, 15_000);

  test.each(["overlay", "escape"] as const)(
    "resets wizard state when dismissed via %s",
    async (mode) => {
      const user = userEvent.setup();

      render(<AddDisplayDialogHarness />);

      await user.type(
        screen.getByLabelText("IP Address or Hostname"),
        "10.0.0.8",
      );
      await user.type(screen.getByLabelText("Password"), "raspberry");
      await user.click(screen.getByRole("button", { name: "Connect" }));

      expect(
        screen.getByRole("radiogroup", { name: "Display output" }),
      ).toBeInTheDocument();

      await dismissDialog(mode, user);

      await user.click(screen.getByRole("button", { name: "Reopen" }));

      expect(
        screen.getByRole("button", { name: "Connect" }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("IP Address or Hostname")).toHaveValue("");
    },
  );
});
