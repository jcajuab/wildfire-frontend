"use client";

import type { ReactElement } from "react";
import { useCallback } from "react";
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
}

export function DisplayGroupsTagsInput({
  id,
  value,
  onValueChange,
  existingGroups,
  disabled = false,
  placeholder = "Add display groups…",
  showLabel = true,
}: DisplayGroupsTagsInputProps): ReactElement {
  const anchorRef = useComboboxAnchor();

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
    <div className="flex flex-col gap-1.5">
      {showLabel && id ? (
        <Label htmlFor={id}>Display Groups (Optional)</Label>
      ) : null}
      <Combobox
        multiple
        value={value as string[]}
        onValueChange={handleValueChange}
        inputValue={inputValue}
        onInputValueChange={(v) => setInputValue(v ?? "")}
        disabled={disabled}
      >
        <ComboboxChips ref={anchorRef} id={id}>
          {value.map((name) => (
            <ComboboxChip key={name}>
              <span className="inline-flex rounded px-1 text-xs font-medium bg-blue-600 text-white">
                {name}
              </span>
            </ComboboxChip>
          ))}
          <ComboboxChipsInput
            placeholder={value.length === 0 ? placeholder : ""}
            onKeyDown={handleKeyDown}
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef}>
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
    </div>
  );
}
