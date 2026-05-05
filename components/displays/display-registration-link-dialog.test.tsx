import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DisplayRegistrationLinkDialog } from "@/components/displays/display-registration-link-dialog";

const { useCreateRegistrationLinkMutationMock, useGetDisplayGroupsQueryMock } =
  vi.hoisted(() => ({
    useCreateRegistrationLinkMutationMock: vi.fn(),
    useGetDisplayGroupsQueryMock: vi.fn(),
  }));

vi.mock("@/lib/api/displays-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/displays-api")>(
    "@/lib/api/displays-api",
  );

  return {
    ...actual,
    useCreateRegistrationLinkMutation: useCreateRegistrationLinkMutationMock,
    useGetDisplayGroupsQuery: useGetDisplayGroupsQueryMock,
  };
});

vi.mock("@/lib/auth-session", () => ({
  ensureFreshAccessToken: vi.fn(),
  getAuthorizationHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/api/base-query", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/base-query")>(
    "@/lib/api/base-query",
  );

  return {
    ...actual,
    getBaseUrl: vi.fn(() => ""),
  };
});

describe("DisplayRegistrationLinkDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useGetDisplayGroupsQueryMock.mockReturnValue({ data: [] });
    useCreateRegistrationLinkMutationMock.mockReturnValue([
      vi.fn(() => ({
        unwrap: vi.fn().mockResolvedValue({
          token: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          attemptId: "b2c4a3f1-6b18-4f90-9d9b-9e1a2f0d9d45",
          expiresAt: "2026-05-05T12:00:00.000Z",
        }),
      })),
      { isLoading: false },
    ]);
  });

  test("creates registration links without collecting resolution", async () => {
    const user = userEvent.setup();
    const createRegistrationLink = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        token: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        attemptId: "b2c4a3f1-6b18-4f90-9d9b-9e1a2f0d9d45",
        expiresAt: "2026-05-05T12:00:00.000Z",
      }),
    }));
    useCreateRegistrationLinkMutationMock.mockReturnValue([
      createRegistrationLink,
      { isLoading: false },
    ]);

    const onOpenChange = vi.fn();

    render(
      <DisplayRegistrationLinkDialog open={true} onOpenChange={onOpenChange} />,
    );

    expect(screen.queryByLabelText("Resolution width")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Resolution height"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Create a registration link for this display."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Fill in the display details below. A registration link will be generated for the display device. After you have the registration link, paste it within the display.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Display Groups")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Select or create display groups"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter display name"),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Auto-generated from display name"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Display Groups (Optional)"),
    ).not.toBeInTheDocument();
    for (const label of [
      "Display Name",
      "Display Slug",
      "Output Type",
      "Output Index",
    ]) {
      const labelElement = screen.getByText(label, { exact: false });
      expect(labelElement).toHaveTextContent(`${label}*`);
      expect(labelElement).toHaveClass("gap-0");
    }
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Display Name/), "Lobby Display");
    expect(screen.getByLabelText(/Display Slug/)).toHaveValue("lobby-display");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(createRegistrationLink).toHaveBeenCalledWith({
        slug: "lobby-display",
        displayName: "Lobby Display",
        outputType: "HDMI",
        outputIndex: 0,
        resolutionWidth: null,
        resolutionHeight: null,
        displayGroups: [],
      });
    });
  });

  test("closes the form when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <DisplayRegistrationLinkDialog open={true} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("autofills editable slug from display name until slug is manually edited", async () => {
    const user = userEvent.setup();

    render(
      <DisplayRegistrationLinkDialog open={true} onOpenChange={vi.fn()} />,
    );

    const displayNameInput = screen.getByLabelText(/Display Name/);
    const slugInput = screen.getByLabelText(/Display Slug/);

    await user.type(displayNameInput, "LB445");
    expect(slugInput).toHaveValue("lb445");

    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Lobby Main Display");
    expect(slugInput).toHaveValue("lobby-main-display");

    await user.clear(slugInput);
    await user.type(slugInput, "Custom Slug");
    expect(slugInput).toHaveValue("custom-slug");

    await user.clear(displayNameInput);
    await user.type(displayNameInput, "Another Display");
    expect(slugInput).toHaveValue("custom-slug");
  });
});
