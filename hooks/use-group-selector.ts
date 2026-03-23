import { useCallback, useMemo, useState } from "react";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";
import type { DisplayGroup } from "@/lib/api/displays-api";

interface UseGroupSelectorOptions {
  readonly value: readonly string[];
  readonly onValueChange: (names: string[]) => void;
  readonly existingGroups: readonly DisplayGroup[];
  readonly excludeSelected?: boolean;
}

export function useGroupSelector({
  value,
  onValueChange,
  existingGroups,
  excludeSelected = false,
}: UseGroupSelectorOptions) {
  const [inputValue, setInputValue] = useState("");

  const trimmed = collapseDisplayGroupWhitespace(inputValue);

  const existingNames = useMemo(
    () => dedupeDisplayGroupNames(existingGroups.map((g) => g.name)),
    [existingGroups],
  );

  const selectedKeys = useMemo(
    () => new Set(value.map((name) => toDisplayGroupKey(name))),
    [value],
  );

  const filteredNames = useMemo(
    () =>
      existingNames.filter((name) => {
        if (excludeSelected && selectedKeys.has(toDisplayGroupKey(name)))
          return false;
        if (trimmed === "") return true;
        return toDisplayGroupKey(name).includes(toDisplayGroupKey(trimmed));
      }),
    [existingNames, trimmed, excludeSelected, selectedKeys],
  );

  const showCreate = useMemo(() => {
    if (trimmed === "") return false;
    if (selectedKeys.has(toDisplayGroupKey(trimmed))) return false;
    return !existingNames.some(
      (name) => toDisplayGroupKey(name) === toDisplayGroupKey(trimmed),
    );
  }, [trimmed, selectedKeys, existingNames]);

  const toggleGroup = useCallback(
    (name: string) => {
      const key = toDisplayGroupKey(name);
      const next = selectedKeys.has(key)
        ? value.filter((n) => toDisplayGroupKey(n) !== key)
        : [...value, name];
      onValueChange(dedupeDisplayGroupNames(next));
      setInputValue("");
    },
    [value, selectedKeys, onValueChange],
  );

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

  const removeLastGroup = useCallback(() => {
    if (value.length === 0) return;
    onValueChange(value.filter((_, i) => i !== value.length - 1));
  }, [value, onValueChange]);

  return {
    inputValue,
    setInputValue,
    trimmed,
    existingNames,
    selectedKeys,
    filteredNames,
    showCreate,
    toggleGroup,
    addPendingName,
    removeLastGroup,
  };
}
