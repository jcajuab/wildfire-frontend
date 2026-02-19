import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DeviceRegistrationInfoDialog } from "@/components/displays/device-registration-info-dialog";

const registerDeviceMock = vi.fn();
const createPairingCodeMock = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/lib/api/devices-api", () => ({
  useRegisterDeviceMutation: () =>
    [registerDeviceMock, { isLoading: false }] as const,
  useCreatePairingCodeMutation: () =>
    [createPairingCodeMock, { isLoading: false }] as const,
}));

describe("DeviceRegistrationInfoDialog", () => {
  beforeEach(() => {
    registerDeviceMock.mockReset();
    createPairingCodeMock.mockReset();
    registerDeviceMock.mockReturnValue({
      unwrap: async () => ({}),
    });
    createPairingCodeMock.mockReturnValue({
      unwrap: async () => ({
        code: "123456",
        expiresAt: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  test("generates pairing code and submits registration payload", async () => {
    const onOpenChange = vi.fn();
    render(
      <DeviceRegistrationInfoDialog open={true} onOpenChange={onOpenChange} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Generate code" }));
    expect(createPairingCodeMock).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText("Identifier"), "display-01");
    await user.type(screen.getByLabelText("Name"), "Lobby Display");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(registerDeviceMock).toHaveBeenCalledWith({
      pairingCode: "123456",
      identifier: "display-01",
      name: "Lobby Display",
      location: undefined,
    });
  });
});
