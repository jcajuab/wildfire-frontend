"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxVirtualList,
} from "@/components/ui/combobox";

export interface UserFilterOption {
  readonly id: string;
  readonly username: string;
  readonly name?: string | null;
  readonly email?: string | null;
}

interface UserFilterComboboxProps {
  readonly id: string;
  readonly value: string;
  readonly options: readonly UserFilterOption[];
  readonly inputValue: string;
  readonly isFetching?: boolean;
  readonly hasMore?: boolean;
  readonly isLoadingMore?: boolean;
  readonly onLoadMore?: () => void;
  readonly onInputValueChange: (value: string) => void;
  readonly onValueChange: (value: string) => void;
}

const ALL_USERS_VALUE = "all";

function formatUserLabel(user: UserFilterOption | undefined): string {
  return user ? `@${user.username}` : "";
}

function formatUserDetail(user: UserFilterOption): string | null {
  const parts = [user.name, user.email].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function UserFilterCombobox({
  id,
  value,
  options,
  inputValue,
  isFetching = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onInputValueChange,
  onValueChange,
}: UserFilterComboboxProps): ReactElement {
  const [open, setOpen] = useState(false);
  const selectedUser = options.find((option) => option.id === value);
  const visibleInputValue = open
    ? inputValue
    : value === ALL_USERS_VALUE
      ? "All users"
      : formatUserLabel(selectedUser);
  const itemValues = useMemo(
    () => [ALL_USERS_VALUE, ...options.map((option) => option.id)],
    [options],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      onInputValueChange("");
    }
  };

  const handleInputValueChange = (nextValue: string | null) => {
    const normalizedValue = nextValue ?? "";
    if (!open && normalizedValue.length === 0 && value !== ALL_USERS_VALUE) {
      onValueChange(ALL_USERS_VALUE);
      onInputValueChange("");
      return;
    }
    onInputValueChange(normalizedValue);
  };

  const handleValueChange = (nextValue: string | null) => {
    if (!nextValue) return;
    onValueChange(nextValue);
    onInputValueChange("");
    setOpen(false);
  };

  return (
    <Combobox
      open={open}
      onOpenChange={handleOpenChange}
      value={value}
      items={itemValues}
      filteredItems={itemValues}
      inputValue={visibleInputValue}
      onInputValueChange={handleInputValueChange}
      onValueChange={handleValueChange}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder="Search users..."
        showClear={value !== ALL_USERS_VALUE || inputValue.length > 0}
      />
      <ComboboxContent>
        <ComboboxVirtualList
          items={[ALL_USERS_VALUE, ...options] as const}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          getItemKey={(item) =>
            typeof item === "string" ? item : `user-${item.id}`
          }
          renderItem={(item) => {
            if (typeof item === "string") {
              return (
                <ComboboxItem value={ALL_USERS_VALUE}>All users</ComboboxItem>
              );
            }
            const user = item;
            const detail = formatUserDetail(user);
            const label = formatUserLabel(user);
            return (
              <ComboboxItem key={user.id} value={user.id} aria-label={label}>
                <span className="flex min-w-0 flex-col pr-5">
                  <span className="truncate font-medium">{label}</span>
                  {detail ? (
                    <span
                      className="truncate text-muted-foreground"
                      aria-hidden="true"
                    >
                      {detail}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            );
          }}
        />
        {isFetching ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Loading users...
          </div>
        ) : (
          <ComboboxEmpty>No matching users.</ComboboxEmpty>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
