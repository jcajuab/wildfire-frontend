import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { SchedulesToolbar } from "@/components/schedules/schedules-toolbar";

type SchedulesToolbarProps = ComponentProps<typeof SchedulesToolbar>;

const baseProps: SchedulesToolbarProps = {
  search: "",
  resourceMode: "display",
  displayGroupSort: "alphabetical",
  scheduleTypeFilter: "all",
  targetResourceIds: [],
  targetResourceOptions: [
    { id: "display-1", name: "Lobby Screen" },
    { id: "display-2", name: "Gym Display" },
  ],
  canCreateSchedule: true,
  canDeleteSchedule: true,
  bulkState: {
    mode: "normal",
    onEnterBulkDelete: vi.fn(),
  },
  onSearchChange: vi.fn(),
  onDisplayGroupSortChange: vi.fn(),
  onScheduleTypeFilterChange: vi.fn(),
  onTargetResourceChange: vi.fn(),
  onClearFilters: vi.fn(),
  onCreatePlaylistSchedule: vi.fn(),
  onCreateFlashSchedule: vi.fn(),
};

function renderToolbar(props: Partial<SchedulesToolbarProps> = {}) {
  return render(<SchedulesToolbar {...baseProps} {...props} />);
}

describe("SchedulesToolbar", () => {
  beforeAll(() => {
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

  test("renders the compact schedules header controls", () => {
    renderToolbar();

    expect(
      screen.getByRole("heading", { name: "Schedules" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search schedules" }),
    ).toHaveAttribute("placeholder", "Search by schedule, display, or content");
    expect(
      screen.getByRole("button", { name: "Filter schedules" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bulk Delete" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Schedule" }),
    ).toBeInTheDocument();
  });

  test("opens filters from the merged search control", async () => {
    const user = userEvent.setup();
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "Filter schedules" }));

    expect(
      screen.getByRole("dialog", { name: "Schedule filters" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "View" })).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Schedule Type" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Time" })).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Target Displays" }),
    ).toBeInTheDocument();
  });

  test("uses readable multi-select target display chips", async () => {
    const user = userEvent.setup();
    const onTargetResourceChange = vi.fn();
    renderToolbar({
      targetResourceIds: ["display-1", "display-2"],
      onTargetResourceChange,
    });

    await user.click(screen.getByRole("button", { name: "Filter schedules" }));

    expect(screen.getAllByText("Lobby Screen")).toHaveLength(2);
    expect(screen.getAllByText("Gym Display")).toHaveLength(2);
    expect(screen.queryByText("display-1")).not.toBeInTheDocument();
    expect(screen.queryByText("display-2")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove Lobby Screen filter" }),
    );

    expect(onTargetResourceChange).toHaveBeenCalledWith(["display-2"]);
  });

  test("selects multiple target displays from the filter picker", async () => {
    const user = userEvent.setup();
    const onTargetResourceChange = vi.fn();
    renderToolbar({
      targetResourceIds: ["display-1"],
      onTargetResourceChange,
    });

    await user.click(screen.getByRole("button", { name: "Filter schedules" }));
    await user.click(screen.getByRole("combobox", { name: "Target Displays" }));
    await user.click(screen.getByRole("option", { name: "Gym Display" }));

    expect(onTargetResourceChange).toHaveBeenCalledWith([
      "display-1",
      "display-2",
    ]);
  });

  test("routes create menu items to handlers", async () => {
    const user = userEvent.setup();
    const onCreatePlaylistSchedule = vi.fn();
    const onCreateFlashSchedule = vi.fn();
    renderToolbar({ onCreatePlaylistSchedule, onCreateFlashSchedule });

    await user.click(screen.getByRole("button", { name: "Create Schedule" }));
    await user.click(screen.getByRole("menuitem", { name: "Playlist" }));
    expect(onCreatePlaylistSchedule).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Create Schedule" }));
    await user.click(screen.getByRole("menuitem", { name: "Flash" }));
    expect(onCreateFlashSchedule).toHaveBeenCalledTimes(1);
  });

  test("renders bulk delete row and keeps create action visible", () => {
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 0,
        onDelete: vi.fn(),
        onCancel: vi.fn(),
      },
    });

    expect(screen.queryByRole("button", { name: "Bulk Delete" })).toBeNull();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Selected" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Schedule" }),
    ).toBeInTheDocument();
  });

  test("gates create and delete controls by permission", () => {
    renderToolbar({ canCreateSchedule: false, canDeleteSchedule: false });

    expect(
      screen.queryByRole("button", { name: "Create Schedule" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Bulk Delete" })).toBeNull();
  });

  test("routes active bulk actions to handlers", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onCancel = vi.fn();
    renderToolbar({
      bulkState: {
        mode: "bulk-delete",
        selectedCount: 2,
        onDelete,
        onCancel,
      },
    });

    const header = screen.getByRole("banner");
    await user.click(
      within(header).getByRole("button", { name: "Delete Selected" }),
    );
    await user.click(within(header).getByRole("button", { name: "Cancel" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
