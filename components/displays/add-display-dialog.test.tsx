import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { AddDisplayDialog } from "@/components/displays/add-display-dialog";

describe("AddDisplayDialog", () => {
  test(
    "supports keyboard navigation for display output radios",
    async () => {
      const user = userEvent.setup();

      render(
        <AddDisplayDialog
          open={true}
          onOpenChange={vi.fn()}
          onRegister={vi.fn()}
          existingGroups={[]}
        />,
      );

      await user.type(
        screen.getByLabelText("IP Address or Hostname"),
        "10.0.0.8",
      );
      await user.type(screen.getByLabelText("Password"), "raspberry");
      await user.click(screen.getByRole("button", { name: "Connect" }));

      const group = screen.getByRole("radiogroup", { name: "Display output" });
      fireEvent.keyDown(group, { key: "ArrowDown" });
      expect(screen.getByRole("radio", { name: /HDMI-0/i })).toHaveAttribute(
        "aria-checked",
        "true",
      );

      fireEvent.keyDown(group, { key: "End" });
      expect(screen.getByRole("radio", { name: /HDMI-1/i })).toHaveAttribute(
        "aria-checked",
        "true",
      );

      fireEvent.keyDown(group, { key: "Home" });
      expect(screen.getByRole("radio", { name: /HDMI-0/i })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    },
    15_000,
  );
});
