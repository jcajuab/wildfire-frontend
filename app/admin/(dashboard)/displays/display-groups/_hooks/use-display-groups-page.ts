"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import {
  useGetDisplaysBootstrapQuery,
  useGetDisplaysQuery,
  useSetDisplayGroupsMutation,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  useUpdateDisplayMutation,
  type BackendDisplay,
  type DisplayGroup,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import { collapseDisplayGroupWhitespace } from "@/lib/display-group-normalization";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { Display } from "@/types/display";

export const DISPLAY_PAGE_SIZE = 12;

export type Axis = "group" | "display";

const AXIS_STORAGE_KEY = "wf.displayGroupsPage.axis";

export const BOOTSTRAP_QUERY: DisplaysListQuery = {
  page: 1,
  pageSize: DISPLAYS_BOOTSTRAP_PAGE_SIZE,
  sortBy: "name",
  sortDirection: "asc",
};

export type ActionMode = "add" | "remove" | null;
export type AddFilter = "ungrouped" | "all";

interface UseDisplayGroupsPageOptions {
  readonly initialData?: DisplaysBootstrapResponse;
}

export interface UseDisplayGroupsPageResult {
  readonly canManageGroups: boolean;

  readonly axis: Axis;
  readonly handleAxisChange: (next: Axis) => void;

  readonly groups: readonly DisplayGroup[];
  readonly filteredGroups: readonly DisplayGroup[];
  readonly isLoading: boolean;
  readonly isError: boolean;

  readonly selectedGroupId: string | null;
  readonly selectedGroup: DisplayGroup | null;

  readonly groupSearch: string;
  readonly setGroupSearch: (v: string) => void;

  readonly displaySearch: string;
  readonly handleDisplaySearchChange: (v: string) => void;

  readonly actionMode: ActionMode;
  readonly addFilter: AddFilter;
  readonly setAddFilter: (v: AddFilter) => void;

  readonly selectedDisplayIds: ReadonlySet<string>;

  readonly paginatedDisplays: readonly BackendDisplay[];
  readonly displayPage: number;
  readonly displayTotal: number;
  readonly setDisplayPage: (page: number) => void;
  readonly isDisplaysLoading: boolean;

  // Display-axis state (left=displays, right=groups)
  readonly selectedDisplayId: string | null;
  readonly selectedDisplay: Display | null;
  readonly leftDisplaySearch: string;
  readonly handleLeftDisplaySearchChange: (v: string) => void;
  readonly leftDisplays: readonly BackendDisplay[];
  readonly leftDisplayPage: number;
  readonly leftDisplayTotal: number;
  readonly setLeftDisplayPage: (page: number) => void;
  readonly isLeftDisplaysLoading: boolean;
  readonly selectedGroupIds: ReadonlySet<string>;
  readonly groupsForRightPane: readonly DisplayGroup[];
  readonly groupsRightPaneTotal: number;
  readonly handleSelectDisplay: (displayId: string) => void;
  readonly handleToggleGroup: (groupId: string) => void;
  readonly handleConfirmAddGroups: () => Promise<void>;
  readonly handleConfirmRemoveGroups: () => Promise<void>;

  // Edit-display dialog (display-axis settings icon)
  readonly editingDisplay: Display | null;
  readonly isEditDisplayOpen: boolean;
  readonly handleOpenEditDisplay: (displayId: string) => void;
  readonly handleEditDisplayOpenChange: (open: boolean) => void;
  readonly handleSaveDisplay: (display: Display) => Promise<boolean>;

  readonly renameGroupId: string | null;
  readonly renameGroupInitialName: string;
  readonly setRenameGroupId: (id: string | null) => void;

  readonly isCreateOpen: boolean;
  readonly setIsCreateOpen: (open: boolean) => void;

  readonly isExecuting: boolean;
  readonly isCreatePending: boolean;
  readonly isRenamePending: boolean;

  readonly handleSelectGroup: (groupId: string) => void;
  readonly handleEnterAdd: () => void;
  readonly handleEnterRemove: () => void;
  readonly handleCancelAction: () => void;
  readonly handleToggleDisplay: (id: string) => void;
  readonly handleConfirmAdd: () => Promise<void>;
  readonly handleConfirmRemove: () => Promise<void>;
  readonly handleCreateGroup: (name: string) => Promise<void>;
  readonly handleRenameGroup: (groupId: string, name: string) => Promise<void>;
}

export function useDisplayGroupsPage({
  initialData,
}: UseDisplayGroupsPageOptions = {}): UseDisplayGroupsPageResult {
  const canManageGroups = useCan("displays:update");

  // Always subscribe to the bootstrap query. With initialData passed from SSR,
  // RTK Query has the cache pre-warmed via the page-level seeder, so the
  // background fetch is cheap; the subscription is what makes optimistic
  // patches and tag invalidations from setDisplayGroups actually take effect.
  const {
    data: queriedData,
    isLoading: queryIsLoading,
    isError,
  } = useGetDisplaysBootstrapQuery(BOOTSTRAP_QUERY);

  const bootstrap = queriedData ?? initialData;
  const isLoading = bootstrap == null && queryIsLoading;

  const [setDisplayGroupsMutation] = useSetDisplayGroupsMutation();
  const [createDisplayGroupMutation, { isLoading: isCreatePending }] =
    useCreateDisplayGroupMutation();
  const [updateDisplayGroupMutation, { isLoading: isRenamePending }] =
    useUpdateDisplayGroupMutation();
  const [updateDisplayMutation] = useUpdateDisplayMutation();

  const [axis, setAxis] = useState<Axis>("group");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [displaySearch, setDisplaySearch] = useState("");
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [selectedDisplayIds, setSelectedDisplayIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const [addFilter, setAddFilter] = useState<AddFilter>("ungrouped");
  const [displayPage, setDisplayPage] = useState(1);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Display-axis state
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(
    null,
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [leftDisplaySearch, setLeftDisplaySearch] = useState("");
  const [leftDisplayPage, setLeftDisplayPage] = useState(1);

  // Edit-display dialog state
  const [editingDisplayId, setEditingDisplayId] = useState<string | null>(null);
  const [isEditDisplayOpen, setIsEditDisplayOpen] = useState(false);

  // Mount-only rehydration of axis preference from localStorage (rule §4 of
  // useEffect guardrails: external system, empty deps).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AXIS_STORAGE_KEY);
      if (saved === "display" || saved === "group") {
        setAxis(saved);
      }
    } catch {
      // localStorage may be unavailable (private mode, etc.)
    }
  }, []);

  const debouncedDisplaySearch = useDebounce(displaySearch, 500);
  const debouncedLeftDisplaySearch = useDebounce(leftDisplaySearch, 500);

  const groups = useMemo(
    () => bootstrap?.displayGroups ?? [],
    [bootstrap?.displayGroups],
  );

  const filteredGroups = useMemo(
    () =>
      groups
        .filter((g) =>
          g.name.toLowerCase().includes(groupSearch.trim().toLowerCase()),
        )
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    [groups, groupSearch],
  );

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const renameGroupInitialName = useMemo(
    () => groups.find((g) => g.id === renameGroupId)?.name ?? "",
    [groups, renameGroupId],
  );

  // Normal/Remove mode: server-side paginated query filtered by group
  const { data: groupDisplaysData, isLoading: isGroupDisplaysLoading } =
    useGetDisplaysQuery(
      {
        groupIds: selectedGroupId ? [selectedGroupId] : [],
        q: debouncedDisplaySearch || undefined,
        page: displayPage,
        pageSize: DISPLAY_PAGE_SIZE,
        sortBy: "name",
        sortDirection: "asc",
      },
      { skip: !selectedGroupId || actionMode === "add" },
    );

  // Add mode: server-side text search, client-side group membership filter
  const { data: addModeDisplaysData } = useGetDisplaysQuery(
    {
      q: debouncedDisplaySearch || undefined,
      page: 1,
      pageSize: DISPLAYS_BOOTSTRAP_PAGE_SIZE,
      sortBy: "name",
      sortDirection: "asc",
    },
    { skip: !selectedGroupId || actionMode !== "add" },
  );

  const displaysForAddMode = useMemo(() => {
    if (!selectedGroup) return [];
    const pool = addModeDisplaysData?.items ?? [];
    if (addFilter === "ungrouped") {
      return pool.filter(
        (d) => !groups.some((g) => g.displayIds.includes(d.id)),
      );
    }
    return pool.filter((d) => !selectedGroup.displayIds.includes(d.id));
  }, [addModeDisplaysData?.items, groups, selectedGroup, addFilter]);

  const addModePaginated = useMemo(() => {
    const start = (displayPage - 1) * DISPLAY_PAGE_SIZE;
    return displaysForAddMode.slice(start, start + DISPLAY_PAGE_SIZE);
  }, [displaysForAddMode, displayPage]);

  const paginatedDisplays =
    actionMode === "add" ? addModePaginated : (groupDisplaysData?.items ?? []);

  const displayTotal =
    actionMode === "add"
      ? displaysForAddMode.length
      : (groupDisplaysData?.total ?? 0);

  const isDisplaysLoading = actionMode !== "add" && isGroupDisplaysLoading;

  // ---- Display-axis: paginated displays list for the left pane ----
  const { data: leftDisplaysData, isLoading: isLeftDisplaysLoading } =
    useGetDisplaysQuery(
      {
        q: debouncedLeftDisplaySearch || undefined,
        page: leftDisplayPage,
        pageSize: DISPLAY_PAGE_SIZE,
        sortBy: "name",
        sortDirection: "asc",
      },
      { skip: axis !== "display" },
    );

  const leftDisplays = useMemo<readonly BackendDisplay[]>(
    () => leftDisplaysData?.items ?? [],
    [leftDisplaysData?.items],
  );
  const leftDisplayTotal = leftDisplaysData?.total ?? 0;

  const selectedDisplayBackend = useMemo<BackendDisplay | null>(() => {
    if (axis !== "display" || !selectedDisplayId) return null;
    return leftDisplays.find((d) => d.id === selectedDisplayId) ?? null;
  }, [axis, leftDisplays, selectedDisplayId]);

  const selectedDisplayGroupIds = useMemo<readonly string[]>(() => {
    if (!selectedDisplayId) return [];
    return groups
      .filter((g) => g.displayIds.includes(selectedDisplayId))
      .map((g) => g.id);
  }, [groups, selectedDisplayId]);

  const selectedDisplayGroups = useMemo<readonly DisplayGroup[]>(() => {
    if (!selectedDisplayId) return [];
    return groups.filter((g) => g.displayIds.includes(selectedDisplayId));
  }, [groups, selectedDisplayId]);

  const selectedDisplay = useMemo<Display | null>(() => {
    if (!selectedDisplayBackend) return null;
    return withDisplayGroups(
      mapDisplayApiToDisplay(selectedDisplayBackend),
      selectedDisplayGroups.map((g) => ({ name: g.name })),
    );
  }, [selectedDisplayBackend, selectedDisplayGroups]);

  // Right-pane groups list depends on action mode
  const groupsForRightPane = useMemo<readonly DisplayGroup[]>(() => {
    if (axis !== "display" || !selectedDisplayId) return [];
    const memberSet = new Set(selectedDisplayGroupIds);
    if (actionMode === "add") {
      return groups
        .filter((g) => !memberSet.has(g.id))
        .toSorted((a, b) => a.name.localeCompare(b.name));
    }
    return selectedDisplayGroups.toSorted((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [
    axis,
    selectedDisplayId,
    actionMode,
    groups,
    selectedDisplayGroups,
    selectedDisplayGroupIds,
  ]);

  // ---- Edit-display dialog: derive Display from current id ----
  const editingDisplay = useMemo<Display | null>(() => {
    if (!editingDisplayId) return null;
    const backend =
      leftDisplays.find((d) => d.id === editingDisplayId) ??
      (selectedDisplayBackend?.id === editingDisplayId
        ? selectedDisplayBackend
        : null);
    if (!backend) return null;
    return withDisplayGroups(
      mapDisplayApiToDisplay(backend),
      groups
        .filter((g) => g.displayIds.includes(editingDisplayId))
        .map((g) => ({ name: g.name })),
    );
  }, [editingDisplayId, leftDisplays, selectedDisplayBackend, groups]);

  const handleDisplaySearchChange = useCallback((v: string) => {
    setDisplaySearch(v);
    setDisplayPage(1);
  }, []);

  const handleSelectGroup = useCallback(
    (groupId: string) => {
      const nextId = selectedGroupId === groupId ? null : groupId;
      setSelectedGroupId(nextId);
      setDisplaySearch("");
      setDisplayPage(1);
      setActionMode(null);
      setSelectedDisplayIds(new Set());
    },
    [selectedGroupId],
  );

  const handleEnterAdd = useCallback(() => {
    setActionMode("add");
    setSelectedDisplayIds(new Set());
    setAddFilter("ungrouped");
    setDisplayPage(1);
  }, []);

  const handleEnterRemove = useCallback(() => {
    setActionMode("remove");
    setSelectedDisplayIds(new Set());
    setDisplayPage(1);
  }, []);

  const handleCancelAction = useCallback(() => {
    setActionMode(null);
    setSelectedDisplayIds(new Set());
  }, []);

  const handleToggleDisplay = useCallback((id: string) => {
    setSelectedDisplayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next as ReadonlySet<string>;
    });
  }, []);

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedGroupId || selectedDisplayIds.size === 0) return;
    setIsExecuting(true);
    try {
      const results = await Promise.allSettled(
        [...selectedDisplayIds].map((displayId) => {
          const currentGroupIds = groups
            .filter((g) => g.displayIds.includes(displayId))
            .map((g) => g.id);
          const newGroupIds = currentGroupIds.includes(selectedGroupId)
            ? currentGroupIds
            : [...currentGroupIds, selectedGroupId];
          return setDisplayGroupsMutation({
            displayId,
            groupIds: newGroupIds,
          }).unwrap();
        }),
      );
      const succeeded = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(
          `${succeeded} display${succeeded !== 1 ? "s" : ""} added to group.`,
        );
      } else {
        toast.warning(`${succeeded} added, ${failed} failed. Try again.`);
      }
    } finally {
      setIsExecuting(false);
      setActionMode(null);
      setSelectedDisplayIds(new Set());
    }
  }, [groups, selectedDisplayIds, selectedGroupId, setDisplayGroupsMutation]);

  const handleConfirmRemove = useCallback(async () => {
    if (!selectedGroupId || selectedDisplayIds.size === 0) return;
    setIsExecuting(true);
    try {
      const results = await Promise.allSettled(
        [...selectedDisplayIds].map((displayId) => {
          const currentGroupIds = groups
            .filter((g) => g.displayIds.includes(displayId))
            .map((g) => g.id);
          return setDisplayGroupsMutation({
            displayId,
            groupIds: currentGroupIds.filter((id) => id !== selectedGroupId),
          }).unwrap();
        }),
      );
      const succeeded = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(
          `${succeeded} display${succeeded !== 1 ? "s" : ""} removed from group.`,
        );
      } else {
        toast.warning(`${succeeded} removed, ${failed} failed. Try again.`);
      }
    } finally {
      setIsExecuting(false);
      setActionMode(null);
      setSelectedDisplayIds(new Set());
    }
  }, [groups, selectedDisplayIds, selectedGroupId, setDisplayGroupsMutation]);

  const handleCreateGroup = useCallback(
    async (name: string) => {
      await createDisplayGroupMutation({
        name: collapseDisplayGroupWhitespace(name),
      }).unwrap();
      toast.success("Display group created.");
      setIsCreateOpen(false);
    },
    [createDisplayGroupMutation],
  );

  const handleRenameGroup = useCallback(
    async (groupId: string, name: string) => {
      await updateDisplayGroupMutation({
        groupId,
        name: collapseDisplayGroupWhitespace(name),
      }).unwrap();
      toast.success("Group renamed.");
      setRenameGroupId(null);
    },
    [updateDisplayGroupMutation],
  );

  // ---- Display-axis handlers ----
  const handleAxisChange = useCallback((next: Axis) => {
    setAxis(next);
    try {
      window.localStorage.setItem(AXIS_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable
    }
    // Reset both axes' selections so users don't carry stale state across.
    setSelectedGroupId(null);
    setSelectedDisplayId(null);
    setActionMode(null);
    setSelectedDisplayIds(new Set());
    setSelectedGroupIds(new Set());
    setGroupSearch("");
    setDisplaySearch("");
    setLeftDisplaySearch("");
    setDisplayPage(1);
    setLeftDisplayPage(1);
  }, []);

  const handleLeftDisplaySearchChange = useCallback((v: string) => {
    setLeftDisplaySearch(v);
    setLeftDisplayPage(1);
  }, []);

  const handleSelectDisplay = useCallback((displayId: string) => {
    setSelectedDisplayId((prev) => (prev === displayId ? null : displayId));
    setActionMode(null);
    setSelectedGroupIds(new Set());
  }, []);

  const handleToggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next as ReadonlySet<string>;
    });
  }, []);

  const handleConfirmAddGroups = useCallback(async () => {
    if (!selectedDisplayId || selectedGroupIds.size === 0) return;
    setIsExecuting(true);
    try {
      const merged = Array.from(
        new Set([...selectedDisplayGroupIds, ...selectedGroupIds]),
      );
      await setDisplayGroupsMutation({
        displayId: selectedDisplayId,
        groupIds: merged,
      }).unwrap();
      const n = selectedGroupIds.size;
      toast.success(`${n} group${n !== 1 ? "s" : ""} added to display.`);
    } catch (err) {
      notifyApiError(err, "Failed to add groups.");
    } finally {
      setIsExecuting(false);
      setActionMode(null);
      setSelectedGroupIds(new Set());
    }
  }, [
    selectedDisplayId,
    selectedDisplayGroupIds,
    selectedGroupIds,
    setDisplayGroupsMutation,
  ]);

  const handleConfirmRemoveGroups = useCallback(async () => {
    if (!selectedDisplayId || selectedGroupIds.size === 0) return;
    setIsExecuting(true);
    try {
      const next = selectedDisplayGroupIds.filter(
        (id) => !selectedGroupIds.has(id),
      );
      await setDisplayGroupsMutation({
        displayId: selectedDisplayId,
        groupIds: next,
      }).unwrap();
      const n = selectedGroupIds.size;
      toast.success(`${n} group${n !== 1 ? "s" : ""} removed from display.`);
    } catch (err) {
      notifyApiError(err, "Failed to remove groups.");
    } finally {
      setIsExecuting(false);
      setActionMode(null);
      setSelectedGroupIds(new Set());
    }
  }, [
    selectedDisplayId,
    selectedDisplayGroupIds,
    selectedGroupIds,
    setDisplayGroupsMutation,
  ]);

  // ---- Edit-display dialog handlers ----
  const handleOpenEditDisplay = useCallback((displayId: string) => {
    setEditingDisplayId(displayId);
    setIsEditDisplayOpen(true);
  }, []);

  const handleEditDisplayOpenChange = useCallback((open: boolean) => {
    setIsEditDisplayOpen(open);
    if (!open) {
      // Defer clearing editingDisplayId until the dialog is closed so the form
      // doesn't lose its current display while animating out.
      setEditingDisplayId(null);
    }
  }, []);

  const handleSaveDisplay = useCallback(
    async (display: Display): Promise<boolean> => {
      try {
        await updateDisplayMutation({
          id: display.id,
          name: display.name,
          output: display.output,
        }).unwrap();
      } catch (err) {
        notifyApiError(err, "Failed to save display details.");
        return false;
      }

      try {
        // Resolve group names → group IDs, creating any missing ones.
        const existingByName = new Map<string, string>();
        for (const g of groups) {
          existingByName.set(g.name.toLowerCase(), g.id);
        }
        const nextGroupIds: string[] = [];
        for (const label of display.groups) {
          const normalized = collapseDisplayGroupWhitespace(label.name);
          if (!normalized) continue;
          const existingId = existingByName.get(normalized.toLowerCase());
          if (existingId) {
            if (!nextGroupIds.includes(existingId)) {
              nextGroupIds.push(existingId);
            }
            continue;
          }
          const created = await createDisplayGroupMutation({
            name: normalized,
          }).unwrap();
          existingByName.set(created.name.toLowerCase(), created.id);
          nextGroupIds.push(created.id);
        }
        await setDisplayGroupsMutation({
          displayId: display.id,
          groupIds: nextGroupIds,
        }).unwrap();
      } catch (err) {
        notifyApiError(
          err,
          "Display details were saved, but group assignment failed.",
        );
        return false;
      }

      toast.success(`Successfully updated ${display.name}`);
      return true;
    },
    [
      updateDisplayMutation,
      groups,
      createDisplayGroupMutation,
      setDisplayGroupsMutation,
    ],
  );

  return {
    canManageGroups,
    axis,
    handleAxisChange,
    groups,
    filteredGroups,
    isLoading,
    isError,
    selectedGroupId,
    selectedGroup,
    groupSearch,
    setGroupSearch,
    displaySearch,
    handleDisplaySearchChange,
    actionMode,
    addFilter,
    setAddFilter,
    selectedDisplayIds,
    paginatedDisplays,
    displayPage,
    displayTotal,
    setDisplayPage,
    isDisplaysLoading,
    selectedDisplayId,
    selectedDisplay,
    leftDisplaySearch,
    handleLeftDisplaySearchChange,
    leftDisplays,
    leftDisplayPage,
    leftDisplayTotal,
    setLeftDisplayPage,
    isLeftDisplaysLoading,
    selectedGroupIds,
    groupsForRightPane,
    groupsRightPaneTotal: groupsForRightPane.length,
    handleSelectDisplay,
    handleToggleGroup,
    handleConfirmAddGroups,
    handleConfirmRemoveGroups,
    editingDisplay,
    isEditDisplayOpen,
    handleOpenEditDisplay,
    handleEditDisplayOpenChange,
    handleSaveDisplay,
    renameGroupId,
    renameGroupInitialName,
    setRenameGroupId,
    isCreateOpen,
    setIsCreateOpen,
    isExecuting,
    isCreatePending,
    isRenamePending,
    handleSelectGroup,
    handleEnterAdd,
    handleEnterRemove,
    handleCancelAction,
    handleToggleDisplay,
    handleConfirmAdd,
    handleConfirmRemove,
    handleCreateGroup,
    handleRenameGroup,
  };
}
