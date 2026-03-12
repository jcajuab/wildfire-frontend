"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreateDisplayGroupMutation,
  useSetDisplayGroupsMutation,
  useUnregisterDisplayMutation,
  useUpdateDisplayMutation,
  type DisplayGroup,
} from "@/lib/api/displays-api";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { getNextDisplayGroupColorIndex } from "@/lib/display-group-colors";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { Display } from "@/types/display";

export function useDisplaysHandlers({
  displayGroupsData,
  displayToUnregister,
}: {
  displayGroupsData: DisplayGroup[];
  displayToUnregister: Display | null;
}) {
  const [updateDisplay] = useUpdateDisplayMutation();
  const [setDisplayGroups] = useSetDisplayGroupsMutation();
  const [createDisplayGroup] = useCreateDisplayGroupMutation();
  const [unregisterDisplay] = useUnregisterDisplayMutation();

  const handleConfirmUnregisterDisplay = useCallback(async () => {
    if (!displayToUnregister) {
      return;
    }
    await unregisterDisplay({ displayId: displayToUnregister.id }).unwrap();
    toast.success(`"${displayToUnregister.name}" was unregistered.`);
  }, [displayToUnregister, unregisterDisplay]);

  const handleSaveDisplay = useCallback(
    async (display: Display): Promise<boolean> => {
      const [screenWidthRaw, screenHeightRaw] = display.resolution.split("x");
      const screenWidth =
        screenWidthRaw && Number.isFinite(Number(screenWidthRaw))
          ? Number(screenWidthRaw)
          : null;
      const screenHeight =
        screenHeightRaw && Number.isFinite(Number(screenHeightRaw))
          ? Number(screenHeightRaw)
          : null;

      try {
        await updateDisplay({
          id: display.id,
          name: display.name,
          location: display.location,
          ipAddress: display.ipAddress === "" ? null : display.ipAddress,
          macAddress: display.macAddress === "" ? null : display.macAddress,
          output: display.output === "Not available" ? null : display.output,
          emergencyContentId: display.emergencyContentId,
          screenWidth,
          screenHeight,
        }).unwrap();
      } catch (updateError) {
        notifyApiError(updateError, "Failed to save display details.");
        return false;
      }

      try {
        const workingGroups = [...displayGroupsData];
        let nextColorIndex = getNextDisplayGroupColorIndex(workingGroups);
        const existingByKey = new Map<string, string>();
        for (const group of workingGroups) {
          const groupKey = toDisplayGroupKey(group.name);
          if (!existingByKey.has(groupKey)) {
            existingByKey.set(groupKey, group.id);
          }
        }

        const selectedGroupNames = dedupeDisplayGroupNames(
          display.groups.map((group) => group.name),
        );
        const nextGroupIds = new Set<string>();
        for (const groupName of selectedGroupNames) {
          const normalizedName = collapseDisplayGroupWhitespace(groupName);
          if (normalizedName.length === 0) continue;

          const groupKey = toDisplayGroupKey(normalizedName);
          const existingId = existingByKey.get(groupKey);
          if (existingId) {
            nextGroupIds.add(existingId);
            continue;
          }

          const created = await createDisplayGroup({
            name: normalizedName,
            colorIndex: nextColorIndex,
          }).unwrap();
          const createdKey = toDisplayGroupKey(created.name);
          existingByKey.set(createdKey, created.id);
          nextGroupIds.add(created.id);
          workingGroups.push(created);
          nextColorIndex = getNextDisplayGroupColorIndex(workingGroups);
        }

        await setDisplayGroups({
          displayId: display.id,
          groupIds: [...nextGroupIds],
        }).unwrap();
      } catch (groupsError) {
        notifyApiError(
          groupsError,
          "Display details were saved, but display-group assignment failed.",
        );
        return false;
      }

      toast.success(`Updated "${display.name}".`);
      return true;
    },
    [updateDisplay, displayGroupsData, createDisplayGroup, setDisplayGroups],
  );

  return {
    handleConfirmUnregisterDisplay,
    handleSaveDisplay,
  };
}
