import { render, screen } from "@testing-library/react";
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
    const onSave = vi.fn();

    render(
      <EditDisplayDialog
        display={makeDisplay()}
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
    const onSave = vi.fn();

    render(
      <EditDisplayDialog
        display={makeDisplay({ displayOutput: "HDMI-0" })}
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
        open={true}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const resolutionInput = screen.getByLabelText("Resolution");
    await user.clear(resolutionInput);
    await user.type(resolutionInput, "Auto-detect");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
