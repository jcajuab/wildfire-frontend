import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ViewScheduleDialog } from "@/components/schedules/view-schedule-dialog";
import type { Schedule } from "@/types/schedule";

const schedule: Schedule = {
  id: "schedule-1",
  name: "Morning playlist",
  kind: "PLAYLIST",
  startDate: "2026-05-10",
  endDate: "2026-05-10",
  startTime: "01:07",
  endTime: "04:07",
  playlist: {
    id: "playlist-1",
    name: "Morning Loop",
  },
  content: null,
  display: {
    id: "display-1",
    name: "Cafeteria North",
  },
  createdBy: "user-1",
  createdAt: "2026-05-10T00:00:00.000Z",
  updatedAt: "2026-05-10T00:00:00.000Z",
};

function renderDialog(
  props: Partial<Parameters<typeof ViewScheduleDialog>[0]> = {},
) {
  const onOpenChange = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(
    <ViewScheduleDialog
      schedule={schedule}
      open
      onOpenChange={onOpenChange}
      onEdit={onEdit}
      onDelete={onDelete}
      {...props}
    />,
  );

  return { onOpenChange, onEdit, onDelete };
}

function getDialogFooter(): HTMLElement {
  const dialog = screen.getByRole("dialog", { name: "Schedule Details" });
  const footer = dialog.querySelector<HTMLElement>(
    '[data-slot="dialog-footer"]',
  );

  if (!footer) {
    throw new Error("Schedule details footer was not rendered.");
  }

  return footer;
}

describe("ViewScheduleDialog", () => {
  test("renders split footer actions with close and edit grouped on the right", () => {
    renderDialog();

    const footer = getDialogFooter();
    const deleteButton = within(footer).getByRole("button", {
      name: "Delete",
    });
    const closeButton = within(footer).getByRole("button", { name: "Close" });
    const editButton = within(footer).getByRole("button", { name: "Edit" });

    expect(deleteButton).toHaveClass("w-full", "sm:w-auto");
    expect(closeButton).toHaveClass("flex-1", "sm:flex-none");
    expect(editButton).toHaveClass("flex-1", "sm:flex-none");
    expect(within(footer).queryByRole("button", { name: "Done" })).toBeNull();
  });

  test("opens delete confirmation before deleting", async () => {
    const user = userEvent.setup();
    const { onDelete, onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      screen.getByRole("alertdialog", { name: "Delete schedule?" }),
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete schedule" }));

    expect(onDelete).toHaveBeenCalledWith(schedule);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("closes the details dialog from the footer", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(
      within(getDialogFooter()).getByRole("button", { name: "Close" }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("passes the selected schedule to edit", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(onEdit).toHaveBeenCalledWith(schedule);
  });

  test("hides actions when handlers are unavailable", () => {
    renderDialog({ onEdit: undefined, onDelete: undefined });
    const footer = getDialogFooter();

    expect(within(footer).queryByRole("button", { name: "Delete" })).toBeNull();
    expect(within(footer).queryByRole("button", { name: "Edit" })).toBeNull();
    expect(
      within(footer).getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
  });
});
