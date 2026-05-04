"use client";

import { useCallback, useMemo, useState } from "react";

export interface BulkSelectionItem {
  readonly id: string;
  readonly label: string;
}

export function useBulkSelection() {
  const [selectedById, setSelectedById] = useState<
    ReadonlyMap<string, BulkSelectionItem>
  >(() => new Map());

  const selectedItems = useMemo(
    () => Array.from(selectedById.values()),
    [selectedById],
  );

  const selectedIds = useMemo(
    () => new Set(selectedById.keys()),
    [selectedById],
  );

  const isSelected = useCallback(
    (id: string) => selectedById.has(id),
    [selectedById],
  );

  const setItemSelected = useCallback(
    (item: BulkSelectionItem, checked: boolean) => {
      setSelectedById((current) => {
        const next = new Map(current);
        if (checked) {
          next.set(item.id, item);
        } else {
          next.delete(item.id);
        }
        return next;
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedById(new Map());
  }, []);

  const removeSelectedIds = useCallback((ids: readonly string[]) => {
    if (ids.length === 0) return;
    setSelectedById((current) => {
      const next = new Map(current);
      for (const id of ids) {
        next.delete(id);
      }
      return next;
    });
  }, []);

  return {
    selectedItems,
    selectedIds,
    selectedCount: selectedItems.length,
    isSelected,
    setItemSelected,
    clearSelection,
    removeSelectedIds,
  };
}
