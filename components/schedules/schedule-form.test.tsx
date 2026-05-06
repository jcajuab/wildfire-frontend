import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CreateScheduleForm } from "@/components/schedules/schedule-form";

const options = {
  availablePlaylists: [{ id: "playlist-1", name: "Morning Loop" }],
  availableFlashContents: [{ id: "content-1", title: "Alert" }],
  availableDisplays: [{ id: "display-1", name: "Lobby" }],
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
};

describe("CreateScheduleForm", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("marks create start times before the current minute invalid", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CreateScheduleForm {...options} />);

    expect(screen.getByLabelText("Start Date")).toHaveAttribute(
      "min",
      "2026-05-06",
    );
    expect(screen.getByLabelText("Start Time")).toHaveAttribute("min", "10:30");

    await user.clear(screen.getByLabelText("Start Time"));
    await user.type(screen.getByLabelText("Start Time"), "10:29");

    expect(
      screen.getByText("Start time must be now or later."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });
});
