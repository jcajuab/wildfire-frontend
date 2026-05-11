import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { StartEmergencyDialog } from "@/components/emergency/start-emergency-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UseGlobalEmergencyReturn } from "@/hooks/use-global-emergency";
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

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
  }: {
    alt: string;
    src: string;
    fill?: boolean;
    sizes?: string;
    className?: string;
  }) => createElement("img", { alt, src }),
}));

vi.mock("@/lib/api/content-api", () => ({
  useListContentQuery: vi.fn(),
}));

vi.mock("@/lib/api/emergency-slots-api", () => ({
  useListEmergencySlotsQuery: vi.fn(),
  useSetEmergencySlotMutation: vi.fn(),
  useClearEmergencySlotMutation: vi.fn(),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
  }) => <div data-open={open}>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => (
    <div role="dialog" aria-label="Start Emergency" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

const useListEmergencySlotsQueryMock = vi.mocked(useListEmergencySlotsQuery);
const useListContentQueryMock = vi.mocked(useListContentQuery);
const useSetEmergencySlotMutationMock = vi.mocked(useSetEmergencySlotMutation);
const useClearEmergencySlotMutationMock = vi.mocked(
  useClearEmergencySlotMutation,
);

const refetchSlotsMock = vi.fn();
const setSlotMock = vi.fn();
const setSlotUnwrapMock = vi.fn();
const clearSlotMock = vi.fn();
const clearSlotUnwrapMock = vi.fn();

const contentItems = [
  {
    id: "content-image",
    title: "Lobby Poster",
    type: "IMAGE" as const,
    status: "READY" as const,
    thumbnailUrl: "https://cdn.example.com/library-poster.jpg",
    mimeType: "image/jpeg",
    fileSize: 1200,
    checksum: "checksum-image",
    width: null,
    height: null,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textPreviewText: null,
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    owner: {
      id: "user-admin",
      username: "admin",
      name: "Admin",
    },
  },
  {
    id: "content-text",
    title: "Campus Advisory",
    type: "TEXT" as const,
    status: "READY" as const,
    thumbnailUrl: null,
    mimeType: "text/html",
    fileSize: 220,
    checksum: "checksum-text",
    width: null,
    height: null,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textPreviewText: "Classes resume at 1 PM.",
    textHtmlContent:
      '<p style="text-align: center;"><strong>Classes resume at 1 PM.</strong></p>',
    createdAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    owner: {
      id: "user-admin",
      username: "admin",
      name: "Admin",
    },
  },
];

function makeEmergency(
  overrides: Partial<UseGlobalEmergencyReturn> = {},
): UseGlobalEmergencyReturn {
  return {
    isActive: false,
    isBusy: false,
    canRead: true,
    canUpdate: true,
    activate: vi.fn(async () => true),
    deactivate: vi.fn(async () => true),
    ...overrides,
  };
}

function renderDialog(emergency: UseGlobalEmergencyReturn = makeEmergency()) {
  return render(
    <TooltipProvider>
      <StartEmergencyDialog
        emergency={emergency}
        trigger={<button type="button">Start Emergency</button>}
      />
    </TooltipProvider>,
  );
}

describe("StartEmergencyDialog", () => {
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
    useListContentQueryMock.mockReturnValue({
      data: {
        items: contentItems,
        total: contentItems.length,
        page: 1,
        pageSize: 15,
      },
      isFetching: false,
    } as unknown as ReturnType<typeof useListContentQuery>);
  });

  test("renders filled slot thumbnails and starts emergency when a slot is clicked", async () => {
    const user = userEvent.setup();
    const activate = vi.fn(async () => true);

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
              thumbnailKey: "thumbs/poster.jpg",
              thumbnailUrl: "https://cdn.example.com/poster.jpg",
            },
            updatedAt: "2026-05-12T00:00:00.000Z",
          },
        ],
      },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog(makeEmergency({ activate }));

    await user.click(
      screen.getByRole("button", {
        name: "Start emergency with Lobby Poster",
      }),
    );

    expect(screen.getByAltText("Lobby Poster thumbnail")).toHaveAttribute(
      "src",
      "https://cdn.example.com/poster.jpg",
    );
    expect(screen.queryByText("Image")).not.toBeInTheDocument();
    expect(screen.queryByText("Slot 1")).not.toBeInTheDocument();
    expect(activate).toHaveBeenCalledWith(1);
  });

  test("opens the content library when an empty slot is clicked and stages selected content", async () => {
    const user = userEvent.setup();

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: { slots: [] },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog();

    await user.click(screen.getByRole("button", { name: "Slot 1" }));
    await user.click(
      screen.getByRole("button", {
        name: "Select Lobby Poster as emergency content",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Content Library", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.queryAllByText("Content Library")).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: "Select Lobby Poster as emergency content",
      }),
    ).toHaveClass("border-primary");
    expect(setSlotMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Manage Emergency Assets" }),
    ).not.toBeInTheDocument();
    expect(useListContentQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 15,
      }),
    );
  });

  test("renders text content previews in filled slots", () => {
    useListEmergencySlotsQueryMock.mockReturnValue({
      data: {
        slots: [
          {
            slotIndex: 2,
            contentId: "content-text",
            content: {
              id: "content-text",
              title: "Campus Advisory",
              type: "TEXT",
              status: "READY",
              thumbnailKey: null,
              thumbnailUrl: null,
              textPreviewText: "Classes resume at 1 PM.",
              textHtmlContent:
                '<p style="text-align: center;"><strong>Classes resume at 1 PM.</strong></p>',
            },
            updatedAt: "2026-05-12T00:00:00.000Z",
          },
        ],
      },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog();

    expect(screen.getByLabelText("Classes resume at 1 PM.")).toBeInTheDocument();
    expect(screen.getByText("Classes resume at 1 PM.")).toBeInTheDocument();
  });

  test("save assigns selected content and returns to the slot grid", async () => {
    const user = userEvent.setup();

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: { slots: [] },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog();

    await user.click(screen.getByRole("button", { name: "Slot 1" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", {
        name: "Select Lobby Poster as emergency content",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(setSlotMock).toHaveBeenCalledWith({
      slotIndex: 1,
      contentId: "content-image",
    });
    await waitFor(() => expect(refetchSlotsMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Slot 1" })).toBeInTheDocument();
  });

  test("back returns from the content library to the slot grid without saving", async () => {
    const user = userEvent.setup();

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: { slots: [] },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog();

    await user.click(screen.getByRole("button", { name: "Slot 1" }));
    expect(
      screen.getByRole("heading", { name: "Content Library", level: 2 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("button", { name: "Slot 1" })).toBeInTheDocument();
    expect(screen.queryByText("Content Library")).not.toBeInTheDocument();
    expect(setSlotMock).not.toHaveBeenCalled();
    expect(refetchSlotsMock).toHaveBeenCalled();
  });

  test("clears a filled slot from the hover action", async () => {
    const user = userEvent.setup();

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
              thumbnailKey: "thumbs/poster.jpg",
              thumbnailUrl: "https://cdn.example.com/poster.jpg",
            },
            updatedAt: "2026-05-12T00:00:00.000Z",
          },
        ],
      },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog();

    const clearButton = screen.getByRole("button", { name: "Clear Slot 1" });
    expect(clearButton).toHaveClass("bg-destructive/10", "shadow-none");
    expect(clearButton).not.toHaveClass("bg-background/95");

    await user.click(clearButton);

    expect(clearSlotMock).toHaveBeenCalledWith({ slotIndex: 1 });
    await waitFor(() => expect(refetchSlotsMock).toHaveBeenCalled());
  });

  test("keeps the picker open when activation fails", async () => {
    const user = userEvent.setup();
    const activate = vi.fn(async () => false);

    useListEmergencySlotsQueryMock.mockReturnValue({
      data: {
        slots: [
          {
            slotIndex: 2,
            contentId: "content-2",
            content: {
              id: "content-2",
              title: "Weather Alert",
              type: "TEXT",
              status: "READY",
              thumbnailKey: null,
              thumbnailUrl: null,
            },
            updatedAt: "2026-05-12T00:00:00.000Z",
          },
        ],
      },
      isFetching: false,
      refetch: refetchSlotsMock,
    } as unknown as ReturnType<typeof useListEmergencySlotsQuery>);

    renderDialog(makeEmergency({ activate }));

    await user.click(
      screen.getByRole("button", {
        name: "Start emergency with Weather Alert",
      }),
    );

    await waitFor(() => expect(activate).toHaveBeenCalledWith(2));
    expect(
      screen.getByRole("dialog", { name: "Start Emergency" }),
    ).toBeInTheDocument();
  });
});
