import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { EmergencySlotDropdown } from "@/components/emergency/emergency-slot-dropdown";
import type { UseGlobalEmergencyReturn } from "@/hooks/use-global-emergency";
import { useListEmergencySlotsQuery } from "@/lib/api/emergency-slots-api";

vi.mock("@/lib/api/emergency-slots-api", () => ({
  useListEmergencySlotsQuery: vi.fn(),
}));

vi.mock("@/components/emergency/emergency-manage-dialog", () => ({
  EmergencyManageDialog: () => null,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
      }}
    >
      {children}
    </button>
  ),
}));

const useListEmergencySlotsQueryMock = vi.mocked(useListEmergencySlotsQuery);

function makeEmergency(
  overrides: Partial<UseGlobalEmergencyReturn> = {},
): UseGlobalEmergencyReturn {
  return {
    isActive: false,
    isBusy: false,
    canRead: true,
    canUpdate: true,
    activate: vi.fn(async () => {}),
    deactivate: vi.fn(async () => {}),
    ...overrides,
  };
}

describe("EmergencySlotDropdown", () => {
  test("activates a filled slot and keeps empty slots disabled", async () => {
    const user = userEvent.setup();
    const activate = vi.fn(async () => {});

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: {
        slots: [
          {
            slotIndex: 1,
            contentId: "content-1",
            content: {
              id: "content-1",
              title: "Lobby Poster",
              type: "IMAGE",
              status: "READY",
              thumbnailKey: null,
            },
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
          {
            slotIndex: 3,
            contentId: "content-2",
            content: {
              id: "content-2",
              title: "Weather Alert",
              type: "TEXT",
              status: "READY",
              thumbnailKey: null,
            },
            updatedAt: "2025-01-01T00:00:00.000Z",
          },
        ],
      },
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    render(
      <EmergencySlotDropdown
        emergency={makeEmergency({ activate })}
        trigger={<button type="button">Start Emergency</button>}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Lobby Poster" }));

    expect(activate).toHaveBeenCalledWith(1);
    expect(screen.getByRole("button", { name: "Slot 2" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Slot 4" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Slot 5" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Manage Emergency Assets" }),
    ).toBeInTheDocument();
  });

  test("renders stop action when global emergency is active", () => {
    const deactivate = vi.fn(async () => {});

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: { slots: [] },
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    render(
      <EmergencySlotDropdown
        emergency={makeEmergency({ isActive: true, deactivate })}
        trigger={<button type="button">Stop Emergency</button>}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Stop Emergency" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Manage Emergency Assets" }),
    ).not.toBeInTheDocument();
  });
});
