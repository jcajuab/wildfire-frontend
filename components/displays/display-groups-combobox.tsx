"use client";

import type { ReactElement } from "react";
import { useMemo, useState, useCallback } from "react";
import { IconCheck, IconSelector } from "@tabler/icons-react";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { getGroupBadgeStyles } from "@/lib/display-group-colors";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";
import { cn } from "@/lib/utils";

export interface DisplayGroupsComboboxProps {
  readonly id?: string;
  readonly value: readonly string[];
  readonly onValueChange: (names: string[]) => void;
  readonly existingGroups: readonly DisplayGroup[];
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly showLabel?: boolean;
  /** When true, dropdown renders above modal dialogs. Use when inside a dialog. */
  readonly aboveModal?: boolean;
}

/**
 * Multi-select scrollable dropdown for display groups. No search — pick from the list.
 * Selected groups are shown as badges on the trigger.
 */
export function DisplayGroupsCombobox({
  id,
  value,
  onValueChange,
  existingGroups,
  disabled = false,
  placeholder = "Select display groups…",
  showLabel = true,
  aboveModal = false,
}: DisplayGroupsComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);

  const existingNames = useMemo(
    () => dedupeDisplayGroupNames(existingGroups.map((g) => g.name)),
    [existingGroups],
  );
  const selectedKeys = useMemo(
    () => new Set(value.map((name) => toDisplayGroupKey(name))),
    [value],
  );
  const nameToColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of existingGroups) {
      map.set(toDisplayGroupKey(g.name), g.colorIndex ?? 0);
    }
    return map;
  }, [existingGroups]);

  const toggleGroup = useCallback(
    (name: string) => {
      const key = toDisplayGroupKey(name);
      const next = selectedKeys.has(key)
        ? value.filter((n) => toDisplayGroupKey(n) !== key)
        : [...value, name];
      onValueChange(dedupeDisplayGroupNames(next));
    },
    [value, selectedKeys, onValueChange],
  );

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length} groups selected`;

  return (
    <div className="flex flex-col gap-1.5">
      {id && showLabel ? (
        <Label htmlFor={id} className="text-sm font-medium">
          Display Groups (Optional)
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Display groups"
            disabled={disabled}
            className={cn(
              "min-h-8 w-full justify-between font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="flex min-w-0 flex-wrap items-center gap-1 truncate">
              {value.length > 0 ? (
                value.map((name) => {
                  const colorIndex =
                    nameToColorIndex.get(toDisplayGroupKey(name)) ?? 0;
                  const styles = getGroupBadgeStyles(colorIndex);
                  return (
                    <span
                      key={name}
                      className={cn(
                        "inline-flex rounded border px-1.5 py-0.5 text-xs font-medium",
                        styles.fill,
                      )}
                    >
                      {name}
                    </span>
                  );
                })
              ) : (
                triggerLabel
              )}
            </span>
            <IconSelector className="text-muted-foreground size-4 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "min-w-[var(--radix-popover-trigger-width)] max-w-sm p-0",
            aboveModal && "z-100",
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto p-1"
            aria-multiselectable
          >
            {existingNames.length === 0 ? (
              <li className="text-muted-foreground px-3 py-2 text-sm">
                No display groups. Create one via Manage Groups.
              </li>
            ) : (
              existingNames.map((name) => {
                const isSelected = selectedKeys.has(toDisplayGroupKey(name));
                return (
                  <li key={name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent/50",
                      )}
                      onClick={() => toggleGroup(name)}
                    >
                      {isSelected ? (
                        <IconCheck className="size-4 shrink-0" />
                      ) : (
                        <span className="size-4 shrink-0" aria-hidden />
                      )}
                      <span className="min-w-0 truncate">{name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
