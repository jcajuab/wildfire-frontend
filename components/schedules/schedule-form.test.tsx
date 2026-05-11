import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  CreateScheduleForm,
  EditScheduleForm,
} from "@/components/schedules/schedule-form";

vi.mock("@/lib/api/playlists-api", () => ({
  useListPlaylistsQuery: () => ({
    data: undefined,
    isFetching: false,
  }),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: () => ({
    data: undefined,
    isFetching: false,
  }),
}));

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

  test("defaults create start time to the current minute", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));

    render(<CreateScheduleForm {...options} />);

    expect(screen.getByLabelText("Start Date")).toHaveTextContent("05/06/2026");
    expect(screen.getByLabelText("Start Time")).toHaveValue("10:30");
    expect(
      screen.queryByText("Start time must be now or later."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  test("uses styled time inputs with schedule bounds", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));

    render(<CreateScheduleForm {...options} />);

    const startTime = screen.getByLabelText("Start Time");
    const endTime = screen.getByLabelText("End Time");

    expect(startTime).toHaveAttribute("type", "time");
    expect(startTime).toHaveAttribute("min", "10:30");
    expect(startTime).toHaveAttribute("step", "60");
    expect(endTime).toHaveAttribute("type", "time");
    expect(endTime).toHaveAttribute("min", "10:31");
    expect(endTime).toHaveAttribute("step", "60");
  });

  test("shows playlist options in the searchable combobox", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<CreateScheduleForm {...options} />);

    await user.click(screen.getByLabelText("Playlist"));

    expect(screen.getByRole("option", { name: "Morning Loop" })).toBeVisible();
  });
});

describe("EditScheduleForm", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("marks edit start times before the current minute invalid", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));

    render(
      <EditScheduleForm
        {...options}
        initialData={{
          name: "Morning Loop",
          kind: "PLAYLIST",
          startDate: "2026-05-06",
          endDate: "2026-05-06",
          startTime: "10:29",
          endTime: "11:00",
          playlistId: "playlist-1",
          contentId: null,
          targetDisplayIds: ["display-1"],
        }}
      />,
    );

    expect(
      screen.getByText("Start time must be now or later."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  test("allows edit start times at the current minute", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-05-06T10:30:00"));

    render(
      <EditScheduleForm
        {...options}
        initialData={{
          name: "Morning Loop",
          kind: "PLAYLIST",
          startDate: "2026-05-06",
          endDate: "2026-05-06",
          startTime: "10:30",
          endTime: "11:00",
          playlistId: "playlist-1",
          contentId: null,
          targetDisplayIds: ["display-1"],
        }}
      />,
    );

    expect(
      screen.queryByText("Start time must be now or later."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
