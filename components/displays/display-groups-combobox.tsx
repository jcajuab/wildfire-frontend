"use client";

import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useRef, useState } from "react";
import { IconCheck, IconPlus, IconSelector } from "@tabler/icons-react";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { toDisplayGroupKey } from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";
import { cn } from "@/lib/utils";
import { useGroupSelector } from "@/hooks/use-group-selector";

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
  /** Portal container element. Pass a ref'd element inside a dialog to keep the
   *  popover within the dialog's DOM subtree, preserving scroll-lock compatibility. */
  readonly portalContainer?: HTMLElement | null;
}

/**
 * Multi-select dropdown for display groups. The trigger is an inline input
 * that shows selected groups as badges and accepts text to search or create.
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
  portalContainer,
}: DisplayGroupsComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    inputValue,
    setInputValue,
    trimmed,
    filteredNames,
    selectedKeys,
    showCreate,
    toggleGroup,
    addPendingName,
    removeLastGroup,
  } = useGroupSelector({ value, onValueChange, existingGroups });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setInputValue("");
    },
    [setInputValue],
  );

  const openAndFocus = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (inputValue) {
          setInputValue("");
        } else {
          setOpen(false);
        }
        return;
      }
      if (e.key === "Backspace" && !inputValue && value.length > 0) {
        removeLastGroup();
        return;
      }
      if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
      e.preventDefault();
      if (showCreate) {
        addPendingName(trimmed);
        return;
      }
      if (filteredNames.length === 1 && filteredNames[0]) {
        toggleGroup(filteredNames[0]);
      }
    },
    [
      inputValue,
      value.length,
      showCreate,
      trimmed,
      filteredNames,
      setInputValue,
      removeLastGroup,
      addPendingName,
      toggleGroup,
    ],
  );

  return (
    <div className="flex flex-col gap-1.5">
      {id && showLabel ? (
        <Label htmlFor={id} className="text-sm font-medium">
          Display Groups (Optional)
        </Label>
      ) : null}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            ref={anchorRef}
            className={cn(
              "flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background transition-colors",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              disabled && "cursor-not-allowed opacity-50 pointer-events-none",
            )}
            onClick={() => {
              if (!disabled) openAndFocus();
            }}
          >
            {value.map((name) => (
              <span
                key={name}
                className="inline-flex rounded border px-1.5 py-0.5 text-xs font-medium bg-blue-600 text-white border-blue-200"
              >
                {name}
              </span>
            ))}

            <input
              id={id}
              ref={inputRef}
              role="combobox"
              aria-expanded={open}
              aria-controls={open ? `${id}-listbox` : undefined}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => !disabled && setOpen(true)}
              onClick={(e) => e.stopPropagation()}
              placeholder={value.length === 0 ? placeholder : ""}
              disabled={disabled}
              className="min-w-20 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />

            <button
              type="button"
              disabled={disabled}
              aria-label="Toggle display groups dropdown"
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
              onClick={(e) => {
                e.stopPropagation();
                if (open) {
                  setOpen(false);
                } else {
                  openAndFocus();
                }
              }}
            >
              <IconSelector className="size-4" />
            </button>
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          container={portalContainer}
          className={cn(
            "flex w-[var(--radix-popover-anchor-width)] flex-col overflow-hidden p-0",
            aboveModal && "z-100",
          )}
          style={{
            maxHeight:
              "min(12rem, var(--radix-popover-content-available-height))",
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (anchorRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-multiselectable
            className="overflow-y-auto p-1"
          >
            {filteredNames.length === 0 && !showCreate ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {existingGroups.length === 0
                  ? "Type a name and press Enter to create."
                  : "No groups match. Press Enter to create."}
              </li>
            ) : (
              filteredNames.map((name) => {
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
            {showCreate ? (
              <li>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => addPendingName(trimmed)}
                >
                  <IconPlus className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">
                    Create &ldquo;{trimmed}&rdquo;
                  </span>
                </button>
              </li>
            ) : null}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
