import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";

import { CalendarHeader } from "@/components/schedules/calendar-header";

describe("CalendarHeader", () => {
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
  });

  test("keeps day and week view controls in the calendar toolbar", async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    const onResourceModeChange = vi.fn();

    render(
      <CalendarHeader
        currentDate={new Date("2026-05-10T00:00:00.000Z")}
        view="resource-day"
        onViewChange={onViewChange}
        resourceMode="display"
        onResourceModeChange={onResourceModeChange}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /May 10, 2026/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Calendar view" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Schedule resources" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("3 displays")).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Week view" }));
    await user.click(screen.getByRole("radio", { name: "Display groups" }));

    expect(onViewChange).toHaveBeenCalledWith("resource-week");
    expect(onResourceModeChange).toHaveBeenCalledWith("display-group");
  });
});
