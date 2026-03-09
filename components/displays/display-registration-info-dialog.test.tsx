import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DisplayRegistrationInfoDialog } from "@/components/displays/display-registration-info-dialog";

const createRegistrationAttemptMock = vi.fn();

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
  useCreateRegistrationAttemptMutation: () =>
    [createRegistrationAttemptMock, { isLoading: false }] as const,
  useRotateRegistrationAttemptMutation: () =>
    [vi.fn(), { isLoading: false }] as const,
  useCloseRegistrationAttemptMutation: () => [vi.fn()] as const,
}));

vi.mock("@/lib/api/base-query", () => ({
  getBaseUrl: () => "",
}));

describe("DisplayRegistrationInfoDialog", () => {
  beforeEach(() => {
    createRegistrationAttemptMock.mockReset();
    createRegistrationAttemptMock.mockReturnValue({
      unwrap: async () => ({
        attemptId: "attempt-1",
        code: "123456",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  test(
    "creates and displays one-time registration code on open",
    async () => {
      const onOpenChange = vi.fn();
      render(
        <DisplayRegistrationInfoDialog
          open={true}
          onOpenChange={onOpenChange}
        />,
      );

      await waitFor(() => {
        expect(createRegistrationAttemptMock).toHaveBeenCalledTimes(1);
      });
      expect(await screen.findByText("123456")).toBeInTheDocument();
      expect(screen.getByText(/Expires at/i)).toBeInTheDocument();
    },
    15_000,
  );
});
