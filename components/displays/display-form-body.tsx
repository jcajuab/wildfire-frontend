"use client";

import type { ReactElement, RefObject } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DisplayGroupsTagsInput } from "@/components/displays/display-groups-tags-input";
import type { DisplayGroup } from "@/lib/api/displays-api";

interface DisplayFormBodyProps {
  readonly mode: "add" | "edit";
  readonly displayName: string;
  readonly onDisplayNameChange: (value: string) => void;
  readonly location: string;
  readonly onLocationChange: (value: string) => void;
  readonly groups: readonly string[];
  readonly onGroupsChange: (names: string[]) => void;
  readonly existingGroups: readonly DisplayGroup[];
  readonly disabled?: boolean;
  readonly portalContainer?: RefObject<HTMLElement | null>;
  readonly groupsSlot?: ReactElement;
}

export function DisplayFormBody({
  mode,
  displayName,
  onDisplayNameChange,
  location,
  onLocationChange,
  groups,
  onGroupsChange,
  existingGroups,
  disabled = false,
  portalContainer,
  groupsSlot,
}: DisplayFormBodyProps): ReactElement {
  const namePrefix = mode === "add" ? "" : "edit-";
  const nameId = `${namePrefix}display-name`;
  const locationId = `${namePrefix}location`;
  const groupsId = `${namePrefix}groups`;
  const nameLabel = "Display Name";
  const namePlaceholder = mode === "add" ? "LB446" : undefined;
  const locationLabel = "Physical Location";
  const locationPlaceholder =
    mode === "add" ? "Bunzel Building - 4th Floor" : undefined;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>{nameLabel}</Label>
        <Input
          id={nameId}
          placeholder={namePlaceholder}
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={locationId}>{locationLabel}</Label>
        <Input
          id={locationId}
          placeholder={locationPlaceholder}
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        {groupsSlot}
        <DisplayGroupsTagsInput
          id={groupsId}
          value={groups}
          onValueChange={onGroupsChange}
          existingGroups={existingGroups}
          disabled={disabled}
          showLabel={!groupsSlot}
          portalContainer={portalContainer}
        />
      </div>
    </>
  );
}
