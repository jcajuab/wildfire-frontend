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
  createdByUser: {
    id: "user-1",
    username: "jane",
    name: "Jane Doe",
  },
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
  const dialog = screen.getByRole("dialog", { name: /schedule details/i });
  const footer = dialog.querySelector<HTMLElement>(
    '[data-slot="dialog-footer"]',
  );

  if (!footer) {
    throw new Error("Schedule details footer was not rendered.");
  }

  return footer;
}

function getDetailLabels(): string[] {
  const dialog = screen.getByRole("dialog", { name: /schedule details/i });
  return Array.from(dialog.querySelectorAll("dt")).map(
    (element) => element.textContent ?? "",
  );
}

describe("ViewScheduleDialog", () => {
  test("keeps delete on the left and close/edit on the right", () => {
    renderDialog();

    const footer = getDialogFooter();
    const destructiveActions = footer.querySelector<HTMLElement>(
      '[data-slot="dialog-footer-destructive-actions"]',
    );
    const primaryActions = footer.querySelector<HTMLElement>(
      '[data-slot="dialog-footer-primary-actions"]',
    );

    if (!destructiveActions || !primaryActions) {
      throw new Error("Schedule details footer action groups were not rendered.");
    }

    const deleteButton = within(footer).getByRole("button", {
      name: "Delete",
    });
    const closeButton = within(footer).getByRole("button", { name: "Close" });
    const editButton = within(footer).getByRole("button", { name: "Edit" });

    expect(footer).toHaveClass("sm:justify-between");
    expect(destructiveActions).toContainElement(deleteButton);
    expect(primaryActions).toContainElement(closeButton);
    expect(primaryActions).toContainElement(editButton);
    expect(deleteButton).toBeInTheDocument();
    expect(closeButton).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
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

  test("shows structured details for users without schedule management permissions", () => {
    renderDialog({
      canViewAssignmentDetails: false,
      onEdit: undefined,
      onDelete: undefined,
    });

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Posted")).toBeInTheDocument();
    expect(screen.getByText("Author")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Visible from")).toBeInTheDocument();
    expect(screen.getByText("Visible until")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Playlist")).toBeInTheDocument();
    expect(screen.getByText("Target display")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Playlist Schedule Details" }),
    ).toBeInTheDocument();
    expect(getDetailLabels()).toEqual([
      "Title",
      "Playlist",
      "Target display",
      "Visible from",
      "Visible until",
      "Duration",
      "Author",
      "Posted",
    ]);
    expect(screen.queryByText("Mode")).toBeNull();
    expect(screen.queryByText("Playlist content")).toBeNull();
    expect(
      screen.getByRole("link", { name: /Cafeteria North/i }),
    ).toHaveAttribute("href", "/admin/displays?q=Cafeteria%20North");
  });

  test("links playlist to view-only route when edit permission is unavailable", () => {
    renderDialog({
      canOpenPlaylistLink: false,
      onEdit: undefined,
      onDelete: undefined,
    });

    expect(screen.queryByText("Mode")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "View contents" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Morning Loop/i })).toHaveAttribute(
      "href",
      "/admin/playlists/view/playlist-1",
    );
    expect(
      screen.getByRole("link", { name: /Cafeteria North/i }),
    ).toHaveAttribute("href", "/admin/displays?q=Cafeteria%20North");
  });

  test("links playlist to edit route when edit permission is available", () => {
    renderDialog({
      canOpenPlaylistLink: true,
      onEdit: undefined,
      onDelete: undefined,
    });

    expect(screen.getByRole("link", { name: /Morning Loop/i })).toHaveAttribute(
      "href",
      "/admin/playlists/edit/playlist-1",
    );
  });

  test("renders flash message and tone without content row", () => {
    renderDialog({
      schedule: {
        ...schedule,
        kind: "FLASH",
        playlist: null,
        content: {
          id: "flash-1",
          title: "Critical update",
          type: "FLASH",
          flashMessage: "The gymnasium has an updated announcement.",
          flashTone: "CRITICAL",
        },
      },
      onEdit: undefined,
      onDelete: undefined,
    });

    expect(screen.queryByText("Content")).toBeNull();
    expect(screen.queryByText("Mode")).toBeNull();
    expect(
      screen.getByRole("dialog", { name: "Flash Schedule Details" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(
      screen.getByText("The gymnasium has an updated announcement."),
    ).toBeInTheDocument();
    expect(screen.getByText("Tone")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(getDetailLabels()).toEqual([
      "Title",
      "Tone",
      "Message",
      "Target display",
      "Visible from",
      "Visible until",
      "Duration",
      "Author",
      "Posted",
    ]);
  });
});
