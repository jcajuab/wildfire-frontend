"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
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
import { getGroupBadgeStyles } from "@/lib/display-group-colors";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";
import { cn } from "@/lib/utils";

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
  const [inputValue, setInputValue] = useState("");
  const anchorRef = useComboboxAnchor();

  const trimmed = collapseDisplayGroupWhitespace(inputValue);

  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of existingGroups) {
      map.set(toDisplayGroupKey(g.name), g.colorIndex ?? 0);
    }
    return map;
  }, [existingGroups]);

  const selectedKeys = useMemo(
    () => new Set(value.map((name) => toDisplayGroupKey(name))),
    [value],
  );

  const existingNames = useMemo(
    () => dedupeDisplayGroupNames(existingGroups.map((g) => g.name)),
    [existingGroups],
  );

  const filteredItems = useMemo(
    () =>
      existingNames.filter((name) => {
        if (selectedKeys.has(toDisplayGroupKey(name))) return false;
        if (trimmed === "") return true;
        return toDisplayGroupKey(name).includes(toDisplayGroupKey(trimmed));
      }),
    [existingNames, selectedKeys, trimmed],
  );

  const showCreate = useMemo(() => {
    if (trimmed === "") return false;
    if (selectedKeys.has(toDisplayGroupKey(trimmed))) return false;
    return !existingNames.some(
      (name) => toDisplayGroupKey(name) === toDisplayGroupKey(trimmed),
    );
  }, [trimmed, selectedKeys, existingNames]);

  const addPendingName = useCallback(
    (name: string) => {
      const normalized = collapseDisplayGroupWhitespace(name);
      if (!normalized) return;
      if (selectedKeys.has(toDisplayGroupKey(normalized))) return;
      onValueChange(dedupeDisplayGroupNames([...value, normalized]));
      setInputValue("");
    },
    [value, selectedKeys, onValueChange],
  );

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
    [trimmed, addPendingName, onValueChange],
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
          {value.map((name) => {
            const colorIndex = nameToColorIndex.get(toDisplayGroupKey(name)) ?? 0;
            const styles = getGroupBadgeStyles(colorIndex);
            return (
              <ComboboxChip key={name} value={name}>
                <span
                  className={cn(
                    "inline-flex rounded px-1 text-xs font-medium",
                    styles.fill,
                  )}
                >
                  {name}
                </span>
              </ComboboxChip>
            );
          })}
          <ComboboxChipsInput
            placeholder={value.length === 0 ? placeholder : ""}
            onKeyDown={handleKeyDown}
          />
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef}>
          <ComboboxList>
            {filteredItems.map((name) => (
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
