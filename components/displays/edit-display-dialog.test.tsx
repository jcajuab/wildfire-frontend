import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { EditDisplayDialog } from "@/components/displays/edit-display-dialog";
import type { Display } from "@/types/display";

const makeDisplay = (overrides?: Partial<Display>): Display => ({
  id: "device-1",
  identifier: "AA:BB:CC:DD:EE:FF",
  name: "Lobby Display",
  status: "READY",
  location: "Main Hall",
  ipAddress: "10.0.0.2",
  macAddress: "AA:BB:CC:DD:EE:FF",
  displayOutput: "Not available",
  resolution: "1920x1080",
  groups: [],
  nowPlaying: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("EditDisplayDialog", () => {
  test("keeps resolution unchanged when selecting display output", async () => {
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

    await user.click(screen.getByRole("radio", { name: /HDMI-0/i }));

    const resolutionInput = screen.getByLabelText(
      "Resolution",
    ) as HTMLInputElement;
    expect(resolutionInput.value).toBe("1920x1080");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOutput: "HDMI-0",
        resolution: "1920x1080",
      }),
    );
  });

  test("allows clearing output using explicit None option", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSave = vi.fn(async () => true);

    render(
      <EditDisplayDialog
        display={makeDisplay({ displayOutput: "HDMI-0" })}
        existingGroups={[]}
        open={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /None/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOutput: "Not available",
      }),
    );
  });

  test("disables save when resolution is invalid", async () => {
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

    const resolutionInput = screen.getByLabelText("Resolution");
    await user.clear(resolutionInput);
    await user.type(resolutionInput, "Auto-detect");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("allows saving when resolution is not available", async () => {
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
    await user.click(screen.getByRole("option", { name: "Lobby" }));
    expect(screen.getByLabelText("Remove Lobby")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
