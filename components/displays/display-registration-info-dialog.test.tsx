import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";

const createRegistrationCodeMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/lib/api/displays-api", () => ({
  useCreateRegistrationCodeMutation: () =>
    [createRegistrationCodeMock, { isLoading: false }] as const,
}));

describe("DisplayRegistrationInfoDialog", () => {
  beforeEach(() => {
    createRegistrationCodeMock.mockReset();
    createRegistrationCodeMock.mockReturnValue({
      unwrap: async () => ({
        code: "123456",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  test("generates and displays one-time registration code", async () => {
    const onOpenChange = vi.fn();
    render(
      <DisplayRegistrationInfoDialog open={true} onOpenChange={onOpenChange} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Generate code" }));

    expect(createRegistrationCodeMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("123456")).toBeInTheDocument();
    expect(screen.getByText(/Expires at/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Register" }),
    ).not.toBeInTheDocument();
  });
});
