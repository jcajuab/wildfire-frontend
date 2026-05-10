import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { DisplayGroupsTagsInput } from "@/components/displays/display-groups-tags-input";
import type { DisplayGroup } from "@/lib/api/displays-api";

const groups: DisplayGroup[] = [
  {
    id: "group-1",
    name: "Lobby",
    displayIds: ["display-1"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("DisplayGroupsTagsInput", () => {
  test("does not show empty text while group options are available", async () => {
    const user = userEvent.setup();

    render(
      <DisplayGroupsTagsInput
        id="display-groups"
        value={[]}
        onValueChange={vi.fn()}
        existingGroups={groups}
      />,
    );

    expect(
      screen.getByPlaceholderText("Select or create display groups"),
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText("Display Groups"));

    expect(screen.getByRole("option", { name: "Lobby" })).toBeInTheDocument();
    expect(
      screen.queryByText("Display Groups Optional"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No groups found.")).not.toBeInTheDocument();
  });
});
