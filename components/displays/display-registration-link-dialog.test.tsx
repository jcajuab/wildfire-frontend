import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    useGetDisplayGroupsQueryMock.mockReturnValue({
      data: { items: [], total: 0, page: 1, pageSize: 100 },
    });
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
      screen.queryByText("Display Groups Optional"),
    ).not.toBeInTheDocument();
    for (const label of [
      "Display Name",
      "Display Slug",
      "Output Type",
      "Output Index",
    ]) {
      const labelElement = screen.getByText(label, { exact: false });
      expect(labelElement).toHaveClass("gap-0");
      expect(labelElement).toHaveClass("after:content-['*']");
      expect(labelElement).toHaveClass("after:text-destructive");
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
        displayGroups: [],
      });
    });
  });

  test("shows a compact generated link step with a done action", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const createRegistrationLink = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({
        token: "464778f0-6e23-4db6-9686-5479796d1b2f",
        attemptId: "b2c4a3f1-6b18-4f90-9d9b-9e1a2f0d9d45",
        expiresAt: "2099-05-05T12:00:00.000Z",
      }),
    }));
    useCreateRegistrationLinkMutationMock.mockReturnValue([
      createRegistrationLink,
      { isLoading: false },
    ]);

    render(
      <DisplayRegistrationLinkDialog open={true} onOpenChange={onOpenChange} />,
    );

    await user.type(screen.getByLabelText(/Display Name/), "Lobby Display");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText(
        "Copy this link and open it on the display device. Registration completes automatically when the device connects.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        /This dialog will close automatically when registration succeeds/,
      ),
    ).not.toBeInTheDocument();

    const registrationLink = screen.getByLabelText("Registration Link");
    expect(registrationLink).toHaveValue(
      "http://localhost:3000/displays/register/link?token=464778f0-6e23-4db6-9686-5479796d1b2f",
    );
    expect(registrationLink).toHaveAttribute("type", "url");
    expect(registrationLink).toHaveAttribute("readonly");
    expect(screen.getByText(/Expires in/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Link" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Next Steps")).toBeInTheDocument();
    expect(screen.getByText("Copy the registration link.")).toBeInTheDocument();
    expect(
      screen.getByText("Open it on the display device."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Keep this dialog open until the display connects."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
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
    render(
      <DisplayRegistrationLinkDialog open={true} onOpenChange={vi.fn()} />,
    );

    const displayNameInput = screen.getByLabelText(/Display Name/);
    const slugInput = screen.getByLabelText(/Display Slug/);

    fireEvent.change(displayNameInput, { target: { value: "LB445" } });
    expect(slugInput).toHaveValue("lb445");

    fireEvent.change(displayNameInput, {
      target: { value: "Lobby Main Display" },
    });
    expect(slugInput).toHaveValue("lobby-main-display");

    fireEvent.change(slugInput, { target: { value: "Custom Slug" } });
    expect(slugInput).toHaveValue("custom-slug");

    fireEvent.change(displayNameInput, {
      target: { value: "Another Display" },
    });
    expect(slugInput).toHaveValue("custom-slug");
  });
});
