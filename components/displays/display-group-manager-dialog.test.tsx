import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DisplayGroupManagerDialog } from "@/components/displays/display-group-manager-dialog";

const {
  useCreateDeviceGroupMutationMock,
  useUpdateDeviceGroupMutationMock,
  useDeleteDeviceGroupMutationMock,
} = vi.hoisted(() => ({
  useCreateDeviceGroupMutationMock: vi.fn(),
  useUpdateDeviceGroupMutationMock: vi.fn(),
  useDeleteDeviceGroupMutationMock: vi.fn(),
}));

vi.mock("@/lib/api/devices-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/devices-api")>(
    "@/lib/api/devices-api",
  );

  return {
    ...actual,
    useCreateDeviceGroupMutation: useCreateDeviceGroupMutationMock,
    useUpdateDeviceGroupMutation: useUpdateDeviceGroupMutationMock,
    useDeleteDeviceGroupMutation: useDeleteDeviceGroupMutationMock,
  };
});

const makeGroup = (overrides?: {
  id?: string;
  name?: string;
  displayIds?: string[];
}) => ({
  id: overrides?.id ?? "group-1",
  name: overrides?.name ?? "Lobby",
  colorIndex: 0,
  displayIds: overrides?.displayIds ?? [],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
});

describe("DisplayGroupManagerDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCreateDeviceGroupMutationMock.mockReturnValue([
      vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue(makeGroup()) })),
      { isLoading: false },
    ]);
    useUpdateDeviceGroupMutationMock.mockReturnValue([
      vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue(makeGroup()) })),
      { isLoading: false },
    ]);
    useDeleteDeviceGroupMutationMock.mockReturnValue([
      vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue(undefined) })),
      { isLoading: false },
    ]);
  });

  test("creates a new group from normalized input", async () => {
    const user = userEvent.setup();
    const unwrapCreate = vi
      .fn()
      .mockResolvedValue(makeGroup({ name: "Main Hall" }));
    const createDeviceGroup = vi.fn(() => ({ unwrap: unwrapCreate }));
    useCreateDeviceGroupMutationMock.mockReturnValue([
      createDeviceGroup,
      { isLoading: false },
    ]);

    render(
      <DisplayGroupManagerDialog
        open={true}
        onOpenChange={vi.fn()}
        groups={[]}
      />,
    );

    await user.type(screen.getByLabelText("New group name"), "  Main   Hall  ");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(createDeviceGroup).toHaveBeenCalledWith({
        name: "Main Hall",
        colorIndex: 0,
      });
    });
  });

  test("renames an existing group and emits reconciliation callback", async () => {
    const user = userEvent.setup();
    const onGroupRenamed = vi.fn();
    const unwrapRename = vi.fn().mockResolvedValue(
      makeGroup({
        id: "group-1",
        name: "Main Hall",
      }),
    );
    const updateDeviceGroup = vi.fn(() => ({ unwrap: unwrapRename }));
    useUpdateDeviceGroupMutationMock.mockReturnValue([
      updateDeviceGroup,
      { isLoading: false },
    ]);

    render(
      <DisplayGroupManagerDialog
        open={true}
        onOpenChange={vi.fn()}
        groups={[makeGroup({ id: "group-1", name: "Lobby" })]}
        onGroupRenamed={onGroupRenamed}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Rename Lobby" }));
    const renameInput = screen.getByLabelText("Rename Lobby");
    await user.clear(renameInput);
    await user.type(renameInput, "Main Hall");
    await user.click(screen.getByRole("button", { name: "Save rename" }));

    await waitFor(() => {
      expect(updateDeviceGroup).toHaveBeenCalledWith({
        groupId: "group-1",
        name: "Main Hall",
      });
      expect(onGroupRenamed).toHaveBeenCalledWith({
        groupId: "group-1",
        previousName: "Lobby",
        nextName: "Main Hall",
      });
    });
  });

  test("deletes a group and emits reconciliation callback", async () => {
    const user = userEvent.setup();
    const onGroupDeleted = vi.fn();
    const unwrapDelete = vi.fn().mockResolvedValue(undefined);
    const deleteDeviceGroup = vi.fn(() => ({ unwrap: unwrapDelete }));
    useDeleteDeviceGroupMutationMock.mockReturnValue([
      deleteDeviceGroup,
      { isLoading: false },
    ]);

    render(
      <DisplayGroupManagerDialog
        open={true}
        onOpenChange={vi.fn()}
        groups={[
          makeGroup({ id: "group-1", name: "Lobby", displayIds: ["a", "b"] }),
        ]}
        onGroupDeleted={onGroupDeleted}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Lobby" }));
    await user.click(screen.getByRole("button", { name: "Delete group" }));

    await waitFor(() => {
      expect(deleteDeviceGroup).toHaveBeenCalledWith({ groupId: "group-1" });
      expect(onGroupDeleted).toHaveBeenCalledWith({
        groupId: "group-1",
        name: "Lobby",
      });
    });
  });
});
