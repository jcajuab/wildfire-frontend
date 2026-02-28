"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  type DisplayGroup,
  useCreateDisplayGroupMutation,
  useDeleteDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
} from "@/lib/api/displays-api";
import {
  collapseDisplayGroupWhitespace,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import { getNextDisplayGroupColorIndex } from "@/lib/display-group-colors";

interface GroupRenameEvent {
  readonly groupId: string;
  readonly previousName: string;
  readonly nextName: string;
}

interface GroupDeleteEvent {
  readonly groupId: string;
  readonly name: string;
}

interface DisplayGroupManagerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly groups: readonly DisplayGroup[];
  readonly onGroupRenamed?: (event: GroupRenameEvent) => void;
  readonly onGroupDeleted?: (event: GroupDeleteEvent) => void;
}

export function DisplayGroupManagerDialog({
  open,
  onOpenChange,
  groups,
  onGroupRenamed,
  onGroupDeleted,
}: DisplayGroupManagerDialogProps): ReactElement {
  const [createName, setCreateName] = useState("");
  const [createNameError, setCreateNameError] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameNameError, setRenameNameError] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<DisplayGroup | null>(
    null,
  );
  const [createDisplayGroup, { isLoading: isCreating }] =
    useCreateDisplayGroupMutation();
  const [updateDisplayGroup, { isLoading: isRenaming }] =
    useUpdateDisplayGroupMutation();
  const [deleteDisplayGroup, { isLoading: isDeleting }] =
    useDeleteDisplayGroupMutation();

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

  const startRename = useCallback((group: DisplayGroup) => {
    setEditingGroupId(group.id);
    setRenameName(group.name);
    setRenameNameError(null);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingGroupId(null);
    setRenameName("");
    setRenameNameError(null);
  }, []);

  const createGroup = useCallback(async () => {
    setCreateNameError(null);
    const nextName = collapseDisplayGroupWhitespace(createName);
    if (nextName.length === 0) {
      setCreateNameError("Group name is required.");
      return;
    }

    const nextKey = toDisplayGroupKey(nextName);
    const existing = groups.find(
      (group) => toDisplayGroupKey(group.name) === nextKey,
    );
    if (existing) {
      setCreateNameError(`"${existing.name}" already exists.`);
      setCreateName("");
      return;
    }

    try {
      await createDisplayGroup({
        name: nextName,
        colorIndex: getNextDisplayGroupColorIndex(groups),
      }).unwrap();
      setCreateName("");
      toast.success(`Created \"${nextName}\".`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create group."));
    }
  }, [createName, createDisplayGroup, groups]);

  const saveRename = useCallback(
    async (group: DisplayGroup) => {
      setRenameNameError(null);
      const nextName = collapseDisplayGroupWhitespace(renameName);
      if (nextName.length === 0) {
        setRenameNameError("Group name is required.");
        return;
      }

      const nextKey = toDisplayGroupKey(nextName);
      const currentKey = toDisplayGroupKey(group.name);
      if (nextKey === currentKey) {
        cancelRename();
        return;
      }

      const conflict = groups.find(
        (item) =>
          item.id !== group.id && toDisplayGroupKey(item.name) === nextKey,
      );
      if (conflict) {
        setRenameNameError(`"${conflict.name}" already exists.`);
        return;
      }

      try {
        const updated = await updateDisplayGroup({
          groupId: group.id,
          name: nextName,
        }).unwrap();
        onGroupRenamed?.({
          groupId: group.id,
          previousName: group.name,
          nextName: updated.name,
        });
        cancelRename();
        toast.success(`Renamed group to \"${updated.name}\".`);
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Failed to rename group."));
      }
    },
    [cancelRename, groups, onGroupRenamed, renameName, updateDisplayGroup],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    try {
      await deleteDisplayGroup({ groupId: deleteCandidate.id }).unwrap();
      onGroupDeleted?.({
        groupId: deleteCandidate.id,
        name: deleteCandidate.name,
      });
      toast.success(`Deleted \"${deleteCandidate.name}\".`);
      setDeleteCandidate(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete group."));
      throw error;
    }
  }, [deleteCandidate, deleteDisplayGroup, onGroupDeleted]);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setCreateName("");
            setCreateNameError(null);
            setEditingGroupId(null);
            setRenameName("");
            setRenameNameError(null);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Groups</DialogTitle>
            <DialogDescription>
              Create, rename, or delete display groups for all displays.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="New group name"
              aria-label="New group name"
              disabled={isCreating}
            />
            <Button
              type="button"
              onClick={() => void createGroup()}
              disabled={isCreating}
            >
              <IconPlus className="size-4" />
              Add
            </Button>
          </div>
          {createNameError ? (
            <p className="text-xs text-destructive">{createNameError}</p>
          ) : null}

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {sortedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No groups yet.</p>
            ) : (
              sortedGroups.map((group) => {
                const isEditing = editingGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 rounded-md border p-2"
                  >
                    {isEditing ? (
                      <Input
                        value={renameName}
                        onChange={(event) => setRenameName(event.target.value)}
                        aria-label={`Rename ${group.name}`}
                        disabled={isRenaming}
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {group.displayIds.length} display
                          {group.displayIds.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    )}

                    {!isEditing ? (
                      <>
                        <Badge variant="secondary" className="shrink-0">
                          {group.displayIds.length}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => startRename(group)}
                          aria-label={`Rename ${group.name}`}
                        >
                          <IconPencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => setDeleteCandidate(group)}
                          aria-label={`Delete ${group.name}`}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={cancelRename}
                          disabled={isRenaming}
                          aria-label="Cancel rename"
                        >
                          <IconX className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          onClick={() => void saveRename(group)}
                          disabled={isRenaming}
                          aria-label="Save rename"
                        >
                          <IconCheck className="size-4" />
                        </Button>
                      </>
                    )}
                    {isEditing && renameNameError ? (
                      <p className="mt-1 text-xs text-destructive">
                        {renameNameError}
                      </p>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={deleteCandidate !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteCandidate(null);
        }}
        title={
          deleteCandidate
            ? `Delete \"${deleteCandidate.name}\"?`
            : "Delete group?"
        }
        description={
          deleteCandidate
            ? `This removes the group for ${deleteCandidate.displayIds.length} display${
                deleteCandidate.displayIds.length === 1 ? "" : "s"
              }.`
            : undefined
        }
        confirmLabel={isDeleting ? "Deleting…" : "Delete group"}
        onConfirm={confirmDelete}
        destructive
      />
    </>
  );
}
