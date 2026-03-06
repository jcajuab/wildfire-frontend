import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import type { Display } from "@/types/display";

const makeDisplay = (overrides?: Partial<Display>): Display => ({
  id: "display-1",
  slug: "lobby-display",
  name: "Lobby Display",
  status: "READY",
  location: "Main Hall",
  ipAddress: "10.0.0.2",
  macAddress: "AA:BB:CC:DD:EE:FF",
  output: "hdmi-0",
  resolution: "1920x1080",
  groups: [],
  nowPlaying: null,
  emergencyContentId: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("EditDisplayDialog", () => {
  test("keeps resolution unchanged when changing display output", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSave = vi.fn(async () => true);

    render(
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    const outputIndexInput = screen.getByLabelText(
      "Display Output Index",
    ) as HTMLInputElement;
    await user.clear(outputIndexInput);
    await user.type(outputIndexInput, "2");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        output: "hdmi-2",
        resolution: "1920x1080",
      }),
    );
  });

  test("disables save when output index is invalid", async () => {
    const user = userEvent.setup();

    render(
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn(async () => true)}
      />,
    );

    const outputIndexInput = screen.getByLabelText(
      "Display Output Index",
    ) as HTMLInputElement;
    await user.clear(outputIndexInput);
    await user.type(outputIndexInput, "-1");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("allows saving when resolution is intentionally empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => true);

    render(
      <EditDisplayDialog
        display={makeDisplay({ resolution: "Not available" })}
        existingGroups={[]}
        open={true}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: "Not available",
      }),
    );
  });

  test("keeps dialog open when save fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSave = vi.fn(async () => false);

    render(
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalled();
    await waitFor(() => {
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });

  test("hides manage groups action without write permission", () => {
    render(
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[]}
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn(async () => true)}
        canManageGroups={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Manage Groups" }),
    ).not.toBeInTheDocument();
  });

  test("allows selecting an existing display group from options", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => true);

    render(
      <EditDisplayDialog
        display={makeDisplay()}
        existingGroups={[
          {
            id: "group-1",
            name: "Lobby",
            colorIndex: 0,
            displayIds: [],
            createdAt: "2025-01-01T00:00:00.000Z",
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ]}
        open={true}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    const groupInput = screen.getByLabelText("Search or add display groups");
    await user.click(groupInput);
    fireEvent.click(screen.getByRole("option", { name: "Lobby" }));
    const lobbyMatches = screen.getAllByText("Lobby");
    const hasSelectedChip = lobbyMatches.some(
      (node) => node.closest('[data-slot="combobox-chip"]') !== null,
    );
    expect(hasSelectedChip).toBe(true);
    expect(onSave).not.toHaveBeenCalled();
  });
});
