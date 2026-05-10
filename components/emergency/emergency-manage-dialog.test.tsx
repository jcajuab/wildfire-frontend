import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { EmergencyManageDialog } from "@/components/emergency/emergency-manage-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useListContentQuery } from "@/lib/api/content-api";
import {
  useClearEmergencySlotMutation,
  useListEmergencySlotsQuery,
  useSetEmergencySlotMutation,
} from "@/lib/api/emergency-slots-api";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/get-api-error-message", () => ({
  notifyApiError: vi.fn(),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(),
}));

vi.mock("@/lib/api/emergency-slots-api", () => ({
  useListEmergencySlotsQuery: vi.fn(),
  useSetEmergencySlotMutation: vi.fn(),
  useClearEmergencySlotMutation: vi.fn(),
}));

const useListContentQueryMock = vi.mocked(useListContentQuery);
const useListEmergencySlotsQueryMock = vi.mocked(useListEmergencySlotsQuery);
const useSetEmergencySlotMutationMock = vi.mocked(useSetEmergencySlotMutation);
const useClearEmergencySlotMutationMock = vi.mocked(
  useClearEmergencySlotMutation,
);

const setSlotMock = vi.fn();
const setSlotUnwrapMock = vi.fn();
const clearSlotMock = vi.fn();
const clearSlotUnwrapMock = vi.fn();
const refetchSlotsMock = vi.fn();

const contentItems = [
  {
    id: "content-image",
    title: "Lobby Poster",
    type: "IMAGE" as const,
    status: "READY" as const,
    thumbnailUrl: "/poster.jpg",
    mimeType: "image/jpeg",
    fileSize: 1200,
    checksum: "checksum-image",
    width: null,
    height: null,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textPreviewText: null,
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    owner: {
      id: "user-admin",
      username: "admin",
      name: "Admin",
    },
  },
  {
    id: "content-text",
    title: "Morning Message",
    type: "TEXT" as const,
    status: "READY" as const,
    thumbnailUrl: undefined,
    mimeType: "text/html",
    fileSize: 512,
    checksum: "checksum-text",
    width: null,
    height: null,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textPreviewText: "Good morning",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    owner: {
      id: "user-admin",
      username: "admin",
      name: "Admin",
    },
  },
];

function renderDialog(onOpenChange = vi.fn()) {
  return render(
    <TooltipProvider>
      <EmergencyManageDialog open onOpenChange={onOpenChange} />
    </TooltipProvider>,
  );
}

describe("EmergencyManageDialog", () => {
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
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();

    refetchSlotsMock.mockResolvedValue({});
    setSlotUnwrapMock.mockResolvedValue({});
    clearSlotUnwrapMock.mockResolvedValue({});
    setSlotMock.mockReturnValue({ unwrap: setSlotUnwrapMock });
    clearSlotMock.mockReturnValue({ unwrap: clearSlotUnwrapMock });
    useSetEmergencySlotMutationMock.mockReturnValue([
      setSlotMock,
    ] as unknown as ReturnType<typeof useSetEmergencySlotMutation>);
    useClearEmergencySlotMutationMock.mockReturnValue([
      clearSlotMock,
    ] as unknown as ReturnType<typeof useClearEmergencySlotMutation>);
    useListEmergencySlotsQueryMock.mockReturnValue({
      data: {
        slots: [
          {
            slotIndex: 1,
            label: "Existing Poster",
            contentId: "content-existing",
            content: {
              id: "content-existing",
              title: "Existing Poster",
              type: "IMAGE",
              status: "READY",
              thumbnailKey: null,
            },
            updatedAt: "2026-05-08T00:00:00.000Z",
          },
        ],
      },
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);
    useListContentQueryMock.mockReturnValue({
      data: {
        items: contentItems,
        total: contentItems.length,
        page: 1,
        pageSize: 9,
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useListContentQuery>);
  });

  test("renders system-consistent sections and copy", () => {
    renderDialog();

    expect(
      screen.getByRole("dialog", { name: "Manage Emergency Assets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose up to five assets that can be activated across all displays.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Emergency Slots")).toBeInTheDocument();
    expect(screen.getByText("Available Content")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Search available content..."),
    ).toBeInTheDocument();
    expect(useListContentQueryMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 9,
      status: "READY",
      excludeType: "FLASH",
      search: undefined,
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    expect(screen.queryByText("Assets")).not.toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Select" })).toBeNull();
    expect(screen.getByRole("dialog")).toHaveClass(
      "h-[min(85vh,42rem)]",
      "max-h-[85vh]",
    );
    expect(
      screen.getByText("Lobby Poster").closest("ul")?.parentElement,
    ).toHaveClass("min-h-0", "flex-1", "overflow-auto");
    const paginationFooter = screen.getByText(
      "Showing 1 to 2 of 2 results",
    ).parentElement;
    expect(paginationFooter).toHaveClass(
      "w-full",
      "border-t",
      "border-border",
      "bg-background",
    );
    expect(
      screen.getByRole("link", { name: "Go to previous page" }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("link", { name: "Go to next page" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  test("clears filled slots immediately", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(
      screen.getByRole("button", { name: "Clear Existing Poster" }),
    );

    expect(clearSlotMock).toHaveBeenCalledWith({ slotIndex: 1 });
    await waitFor(() => expect(refetchSlotsMock).toHaveBeenCalled());
  });

  test("assigns content by selecting an empty slot then clicking a content card", async () => {
    const user = userEvent.setup();
    renderDialog();

    expect(
      screen.getByRole("button", {
        name: "Select Lobby Poster as emergency content",
      }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Select Slot 2" }));
    await user.click(
      screen.getByRole("button", {
        name: "Select Lobby Poster as emergency content",
      }),
    );

    expect(setSlotMock).toHaveBeenCalledWith({
      slotIndex: 2,
      contentId: "content-image",
      label: "Lobby Poster",
    });
    await waitFor(() => expect(refetchSlotsMock).toHaveBeenCalled());
  });

  test("done closes the dialog without saving staged changes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog(onOpenChange);

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(setSlotMock).not.toHaveBeenCalled();
    expect(clearSlotMock).not.toHaveBeenCalled();
  });
});
