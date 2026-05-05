"use client";

import type { ReactElement, RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";
import { useGroupSelector } from "@/hooks/use-group-selector";

export interface DisplayGroupsTagsInputProps {
  readonly id?: string;
  readonly value: readonly string[];
  readonly onValueChange: (names: string[]) => void;
  readonly existingGroups: readonly DisplayGroup[];
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly showLabel?: boolean;
  readonly portalContainer?: HTMLElement | null | RefObject<HTMLElement | null>;
}

export function DisplayGroupsTagsInput({
  id,
  value,
  onValueChange,
  existingGroups,
  disabled = false,
  placeholder = "Select or create display groups",
  showLabel = true,
  portalContainer,
}: DisplayGroupsTagsInputProps): ReactElement {
  const anchorRef = useComboboxAnchor();
  const localPortalContainerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const resolvedPortalContainer = portalContainer ?? localPortalContainerRef;

  const {
    inputValue,
    setInputValue,
    trimmed,
    filteredNames,
    selectedKeys,
    showCreate,
    addPendingName,
  } = useGroupSelector({
    value,
    onValueChange,
    existingGroups,
    excludeSelected: true,
  });
  const itemNames = dedupeDisplayGroupNames([
    ...existingGroups.map((group) => group.name),
    ...value,
    "__create__",
  ]);
  const renderedItems = showCreate
    ? [...filteredNames, "__create__"]
    : filteredNames;

  const handleValueChange = useCallback(
    (next: unknown) => {
      const nextArr = Array.isArray(next) ? (next as string[]) : [];
      if (nextArr.includes("__create__")) {
        if (trimmed) {
          addPendingName(trimmed);
        }
        return;
      }
      onValueChange(dedupeDisplayGroupNames(nextArr));
      setInputValue("");
    },
    [trimmed, addPendingName, onValueChange, setInputValue],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
      if (!trimmed) return;
      if (selectedKeys.has(toDisplayGroupKey(trimmed))) return;
      e.preventDefault();
      addPendingName(trimmed);
    },
    [trimmed, selectedKeys, addPendingName],
  );

  return (
    <div className="relative flex flex-col gap-1.5">
      {showLabel && id ? <Label htmlFor={id}>Display Groups</Label> : null}
      <Combobox
        multiple
        value={value as string[]}
        items={itemNames}
        filteredItems={renderedItems}
        onValueChange={handleValueChange}
        inputValue={inputValue}
        onInputValueChange={(v) => setInputValue(v ?? "")}
        open={open}
        onOpenChange={(next) => setOpen(next)}
        disabled={disabled}
      >
        <ComboboxChips ref={anchorRef}>
          {value.map((name) => (
            <ComboboxChip key={name}>
              <span className="inline-flex rounded px-1 text-xs font-medium bg-blue-600 text-white">
                {name}
              </span>
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            id={id}
            placeholder={value.length === 0 ? placeholder : ""}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef} container={resolvedPortalContainer}>
          <ComboboxList>
            {filteredNames.map((name) => (
              <ComboboxItem key={name} value={name}>
                {name}
              </ComboboxItem>
            ))}
            {showCreate ? (
              <ComboboxItem key="__create__" value="__create__">
                Create &ldquo;{trimmed}&rdquo;
              </ComboboxItem>
            ) : null}
          </ComboboxList>
          <ComboboxEmpty>No groups found.</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      {portalContainer ? null : (
        <div
          ref={localPortalContainerRef}
          className="pointer-events-none absolute inset-0 z-50"
        />
      )}
    </div>
  );
}
