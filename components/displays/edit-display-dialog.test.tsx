import { useState, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Display } from "@/types/display";

const makeDisplay = (overrides?: Partial<Display>): Display => ({
  id: "display-1",
  slug: "lobby-display",
  name: "Lobby Display",
  status: "READY",
  output: "hdmi-0",
  groups: [],
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function EditDisplayDialogHarness(): ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={open}
        onOpenChange={setOpen}
        onSave={vi.fn(async () => true)}
      />
    </>
  );
}

function renderEditDisplayDialog(
  props: Partial<Parameters<typeof EditDisplayDialog>[0]> = {},
) {
  return render(
    <TooltipProvider>
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn(async () => true)}
        {...props}
      />
    </TooltipProvider>,
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

describe("EditDisplayDialog", () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  test("renders the simplified edit display form", () => {
    renderEditDisplayDialog();

    expect(
      screen.getByRole("heading", { name: "Edit Display" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Update display details and groups."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Display Slug")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Display slug help" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /display groups/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage Groups" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Output Type" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Output Index")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Slug is fixed after registration and used by display runtime identity.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Resolution Width")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Resolution Height"),
    ).not.toBeInTheDocument();
  });

  test("shows compact help in tooltips", async () => {
    const user = userEvent.setup();

    renderEditDisplayDialog();

    await user.hover(screen.getByRole("button", { name: "Display slug help" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Slug is fixed after registration and used by display runtime identity.",
    );
  });

  test("keeps display output controls read-only", () => {
    renderEditDisplayDialog();

    expect(
      screen.getByRole("combobox", { name: "Output Type" }),
    ).toHaveAttribute("data-disabled");
    expect(screen.getByLabelText("Output Index")).toBeDisabled();
  });

  test("preserves display output when saving", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSave = vi.fn(async () => true);

    renderEditDisplayDialog({
      onOpenChange,
      onSave,
    });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        output: "hdmi-0",
      }),
    );
  }, 15_000);

  test("keeps dialog open when save fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSave = vi.fn(async () => false);

    renderEditDisplayDialog({ onOpenChange, onSave });

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalled();
    await waitFor(() => {
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  test("does not render manage groups in the edit modal", () => {
    renderEditDisplayDialog();

    expect(
      screen.queryByRole("button", { name: "Manage Groups" }),
    ).not.toBeInTheDocument();
  });

  test("allows selecting an existing display group from options", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => true);

    renderEditDisplayDialog({
      existingGroups: [
        {
          id: "group-1",
          name: "Lobby",
          displayIds: [],
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      onSave,
    });

    const combobox = screen.getByRole("combobox", { name: /display groups/i });
    await user.click(combobox);
    await user.click(screen.getByRole("option", { name: "Lobby" }));
    expect(
      screen.getByText("Lobby", { selector: "span.inline-flex" }),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  test.each(["overlay", "escape"] as const)(
    "resets edited values when dismissed via %s",
    async (mode) => {
      const user = userEvent.setup();

      render(
        <TooltipProvider>
          <EditDisplayDialogHarness />
        </TooltipProvider>,
      );

      const nameInput = screen.getByLabelText(
        "Display Name",
      ) as HTMLInputElement;
      await user.clear(nameInput);
      await user.type(nameInput, "Temporary Name");

      await dismissDialog(mode, user);

      await user.click(screen.getByRole("button", { name: "Reopen" }));

      expect(screen.getByLabelText("Display Name")).toHaveValue(
        "Lobby Display",
      );
    },
  );
});
