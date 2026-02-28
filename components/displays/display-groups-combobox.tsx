"use client";

import type { ReactElement } from "react";
import { useMemo, useState, useCallback, useRef } from "react";
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
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { getGroupBadgeStyles } from "@/lib/display-group-colors";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/devices-api";

export interface DisplayGroupsComboboxProps {
  readonly id?: string;
  readonly value: readonly string[];
  readonly onValueChange: (names: string[]) => void;
  readonly existingGroups: readonly DisplayGroup[];
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly showLabel?: boolean;
}

/**
 * Multi-select combobox for display groups: dropdown + search, with optional
 * "Add" for new names. Chips use palette colors from existing group colorIndex.
 */
export function DisplayGroupsCombobox({
  id,
  value,
  onValueChange,
  existingGroups,
  disabled = false,
  placeholder = "Search or add display groups…",
  showLabel = true,
}: DisplayGroupsComboboxProps): ReactElement {
  const anchorRef = useComboboxAnchor();
  const portalContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputValue, setInputValue] = useState("");

  const existingNames = useMemo(
    () => dedupeDisplayGroupNames(existingGroups.map((g) => g.name)),
    [existingGroups],
  );
  const selectedKeys = useMemo(
    () => new Set(value.map((name) => toDisplayGroupKey(name))),
    [value],
  );
  const existingKeys = useMemo(
    () => new Set(existingNames.map((name) => toDisplayGroupKey(name))),
    [existingNames],
  );
  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of existingGroups) {
      map.set(toDisplayGroupKey(g.name), g.colorIndex ?? 0);
    }
    return map;
  }, [existingGroups]);

  const createOption = useMemo(() => {
    const trimmed = dedupeDisplayGroupNames([inputValue])[0];
    if (
      trimmed === undefined ||
      selectedKeys.has(toDisplayGroupKey(trimmed)) ||
      existingKeys.has(toDisplayGroupKey(trimmed))
    ) {
      return null;
    }
    return trimmed;
  }, [inputValue, selectedKeys, existingKeys]);

  const optionNames = useMemo(() => {
    if (createOption) return [...existingNames, createOption];
    return existingNames;
  }, [existingNames, createOption]);

  const handleValueChange = useCallback(
    (next: string[] | null) => {
      const normalizedSelection = dedupeDisplayGroupNames(next ?? []);
      onValueChange(normalizedSelection);
      if (
        createOption &&
        normalizedSelection.some(
          (name) => toDisplayGroupKey(name) === toDisplayGroupKey(createOption),
        )
      ) {
        setInputValue("");
      }
    },
    [onValueChange, createOption],
  );

  return (
    <div ref={portalContainerRef} className="flex flex-col gap-1.5">
      {id && showLabel ? (
        <Label htmlFor={id} className="text-sm font-medium">
          Display Groups (Optional)
        </Label>
      ) : null}
      <Combobox
        multiple
        value={value.length > 0 ? [...value] : null}
        onValueChange={handleValueChange}
        inputValue={inputValue}
        onInputValueChange={(v) => setInputValue(v ?? "")}
        disabled={disabled}
      >
        <ComboboxChips ref={anchorRef} id={id}>
          <ComboboxValue>
            {(selected: string[] | null) => (
              <>
                {Array.isArray(selected) &&
                  selected.map((name) => {
                    const colorIndex =
                      nameToColorIndex.get(toDisplayGroupKey(name)) ?? 0;
                    const styles = getGroupBadgeStyles(colorIndex);
                    return (
                      <ComboboxChip
                        key={name}
                        className={`border ${styles.fill}`}
                        removeAriaLabel={`Remove ${name}`}
                      >
                        {name}
                      </ComboboxChip>
                    );
                  })}
                <ComboboxChipsInput
                  placeholder={selected?.length ? undefined : placeholder}
                  aria-label="Search or add display groups"
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchorRef} container={portalContainerRef}>
          <ComboboxEmpty>No matching display group.</ComboboxEmpty>
          <ComboboxList>
            {optionNames.map((name) => (
              <ComboboxItem key={name} value={name}>
                {name === createOption ? `Add "${name}"` : name}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
