"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import {
  displaysApi,
  useGetDisplaysBootstrapQuery,
  useGetDisplaysQuery,
  useGetDisplaysInfiniteQuery,
  useGetDisplayGroupsInfiniteQuery,
  useGetDisplayGroupsForDisplayQuery,
  useResolveDisplayGroupsMutation,
  useSetDisplayGroupsMutation,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  useUpdateDisplayMutation,
  type BackendDisplay,
  type DisplayGroup,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { useAppDispatch } from "@/lib/hooks";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import { collapseDisplayGroupWhitespace } from "@/lib/display-group-normalization";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  mapDisplayApiToDisplay,
  withDisplayGroups,
} from "@/lib/mappers/display-mapper";
import type { Display } from "@/types/display";

export const DISPLAY_PAGE_SIZE = 12;
export const GROUP_PAGE_SIZE = 12;
// Internal query for "all groups for a single display" — display can belong
// to many groups but rarely more than a few dozen; 200 is a safe ceiling.
const SELECTED_DISPLAY_GROUPS_PAGE_SIZE = 200;

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

  readonly leftGroups: readonly DisplayGroup[];
  readonly isLoading: boolean;
  readonly isError: boolean;

  readonly hasMoreLeftGroups: boolean;
  readonly isFetchingMoreLeftGroups: boolean;
  readonly fetchMoreLeftGroups: () => void;

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
  readonly isLeftDisplaysLoading: boolean;
  readonly hasMoreLeftDisplays: boolean;
  readonly isFetchingMoreLeftDisplays: boolean;
  readonly fetchMoreLeftDisplays: () => void;
  readonly selectedGroupIds: ReadonlySet<string>;
  readonly groupsForRightPane: readonly DisplayGroup[];
  readonly groupsRightPanePage: number;
  readonly groupsRightPaneTotal: number;
  readonly setGroupsRightPanePage: (page: number) => void;
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

  // Bootstrap is still subscribed (other consumers seed it), but the
  // display-groups page no longer depends on `bootstrap.displayGroups`.
  const {
    data: queriedData,
    isLoading: queryIsLoading,
    isError,
  } = useGetDisplaysBootstrapQuery(BOOTSTRAP_QUERY);

  const bootstrap = queriedData ?? initialData;

  const dispatch = useAppDispatch();
  const [setDisplayGroupsMutation] = useSetDisplayGroupsMutation();
  const [createDisplayGroupMutation, { isLoading: isCreatePending }] =
    useCreateDisplayGroupMutation();
  const [updateDisplayGroupMutation, { isLoading: isRenamePending }] =
    useUpdateDisplayGroupMutation();
  const [updateDisplayMutation] = useUpdateDisplayMutation();
  const [resolveDisplayGroupsMutation] = useResolveDisplayGroupsMutation();

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
  const [groupsRightPanePage, setGroupsRightPanePage] = useState(1);

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
  const debouncedGroupSearch = useDebounce(groupSearch, 500);

  // ---- Left pane "By group": infinite-scroll groups list ----
  const groupsInfinite = useGetDisplayGroupsInfiniteQuery(
    {
      pageSize: GROUP_PAGE_SIZE,
      q: debouncedGroupSearch || undefined,
    },
    { skip: axis !== "group" },
  );

  const leftGroups = useMemo<readonly DisplayGroup[]>(
    () => groupsInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [groupsInfinite.data?.pages],
  );
  const hasMoreLeftGroups = groupsInfinite.hasNextPage;
  const isFetchingMoreLeftGroups = groupsInfinite.isFetchingNextPage;
  const fetchMoreLeftGroups = useCallback(() => {
    void groupsInfinite.fetchNextPage();
  }, [groupsInfinite]);

  const isLoading =
    bootstrap == null && queryIsLoading && groupsInfinite.isLoading;

  const selectedGroup = useMemo(
    () => leftGroups.find((g) => g.id === selectedGroupId) ?? null,
    [leftGroups, selectedGroupId],
  );

  const renameGroupInitialName = useMemo(
    () => leftGroups.find((g) => g.id === renameGroupId)?.name ?? "",
    [leftGroups, renameGroupId],
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

  // Add mode: server-side text search + membership=ungrouped|any filter
  const { data: addModeDisplaysData } = useGetDisplaysQuery(
    {
      q: debouncedDisplaySearch || undefined,
      page: displayPage,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: "name",
      sortDirection: "asc",
      membership: addFilter === "ungrouped" ? "ungrouped" : "any",
    },
    { skip: !selectedGroupId || actionMode !== "add" },
  );

  const addModePool = useMemo<readonly BackendDisplay[]>(() => {
    if (!selectedGroup) return [];
    const pool = addModeDisplaysData?.items ?? [];
    // For "all non-members" we still need to exclude the selected group's
    // current members, since the backend filter is membership=any.
    if (addFilter !== "ungrouped") {
      return pool.filter((d) => !selectedGroup.displayIds.includes(d.id));
    }
    return pool;
  }, [addModeDisplaysData?.items, selectedGroup, addFilter]);

  const paginatedDisplays =
    actionMode === "add" ? addModePool : (groupDisplaysData?.items ?? []);

  const displayTotal =
    actionMode === "add"
      ? (addModeDisplaysData?.total ?? 0)
      : (groupDisplaysData?.total ?? 0);

  const isDisplaysLoading = actionMode !== "add" && isGroupDisplaysLoading;

  // ---- Display-axis: infinite-scroll displays list for the left pane ----
  const displaysInfinite = useGetDisplaysInfiniteQuery(
    {
      q: debouncedLeftDisplaySearch || undefined,
      pageSize: DISPLAY_PAGE_SIZE,
      sortBy: "name",
      sortDirection: "asc",
    },
    { skip: axis !== "display" },
  );

  const leftDisplays = useMemo<readonly BackendDisplay[]>(
    () => displaysInfinite.data?.pages.flatMap((p) => p.items) ?? [],
    [displaysInfinite.data?.pages],
  );
  const isLeftDisplaysLoading = displaysInfinite.isLoading;
  const hasMoreLeftDisplays = displaysInfinite.hasNextPage;
  const isFetchingMoreLeftDisplays = displaysInfinite.isFetchingNextPage;
  const fetchMoreLeftDisplays = useCallback(() => {
    void displaysInfinite.fetchNextPage();
  }, [displaysInfinite]);

  const selectedDisplayBackend = useMemo<BackendDisplay | null>(() => {
    if (axis !== "display" || !selectedDisplayId) return null;
    return leftDisplays.find((d) => d.id === selectedDisplayId) ?? null;
  }, [axis, leftDisplays, selectedDisplayId]);

  // ---- Selected display's groups (full list, capped) for derivations like
  // selectedDisplay.groups and the edit dialog. ----
  const { data: selectedDisplayGroupsData } =
    useGetDisplayGroupsForDisplayQuery(
      {
        displayId: selectedDisplayId ?? "",
        page: 1,
        pageSize: SELECTED_DISPLAY_GROUPS_PAGE_SIZE,
        membership: "member",
      },
      { skip: selectedDisplayId == null },
    );

  const selectedDisplayGroups = useMemo<readonly DisplayGroup[]>(
    () => selectedDisplayGroupsData?.items ?? [],
    [selectedDisplayGroupsData?.items],
  );
  const selectedDisplayGroupIds = useMemo<readonly string[]>(
    () => selectedDisplayGroups.map((g) => g.id),
    [selectedDisplayGroups],
  );

  const selectedDisplay = useMemo<Display | null>(() => {
    if (!selectedDisplayBackend) return null;
    return withDisplayGroups(
      mapDisplayApiToDisplay(selectedDisplayBackend),
      selectedDisplayGroups.map((g) => ({ name: g.name })),
    );
  }, [selectedDisplayBackend, selectedDisplayGroups]);

  // ---- Right-pane groups: paginated, filtered by add/remove mode ----
  const { data: rightPaneGroupsData } = useGetDisplayGroupsForDisplayQuery(
    {
      displayId: selectedDisplayId ?? "",
      page: groupsRightPanePage,
      pageSize: GROUP_PAGE_SIZE,
      q: debouncedDisplaySearch || undefined,
      membership: actionMode === "add" ? "non-member" : "member",
    },
    { skip: axis !== "display" || selectedDisplayId == null },
  );

  const groupsForRightPane = useMemo<readonly DisplayGroup[]>(
    () => rightPaneGroupsData?.items ?? [],
    [rightPaneGroupsData?.items],
  );
  const groupsRightPaneTotal = rightPaneGroupsData?.total ?? 0;

  // ---- Edit-display dialog: groups for the editing display id ----
  const { data: editingDisplayGroupsData } = useGetDisplayGroupsForDisplayQuery(
    {
      displayId: editingDisplayId ?? "",
      page: 1,
      pageSize: SELECTED_DISPLAY_GROUPS_PAGE_SIZE,
      membership: "member",
    },
    { skip: editingDisplayId == null },
  );

  const editingDisplay = useMemo<Display | null>(() => {
    if (!editingDisplayId) return null;
    const backend =
      leftDisplays.find((d) => d.id === editingDisplayId) ??
      (selectedDisplayBackend?.id === editingDisplayId
        ? selectedDisplayBackend
        : null);
    if (!backend) return null;
    const groupNames = (editingDisplayGroupsData?.items ?? []).map((g) => ({
      name: g.name,
    }));
    return withDisplayGroups(mapDisplayApiToDisplay(backend), groupNames);
  }, [
    editingDisplayId,
    leftDisplays,
    selectedDisplayBackend,
    editingDisplayGroupsData?.items,
  ]);

  const handleDisplaySearchChange = useCallback((v: string) => {
    setDisplaySearch(v);
    setDisplayPage(1);
    setGroupsRightPanePage(1);
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
    setSelectedGroupIds(new Set());
    setAddFilter("ungrouped");
    setDisplayPage(1);
    setGroupsRightPanePage(1);
  }, []);

  const handleEnterRemove = useCallback(() => {
    setActionMode("remove");
    setSelectedDisplayIds(new Set());
    setSelectedGroupIds(new Set());
    setDisplayPage(1);
    setGroupsRightPanePage(1);
  }, []);

  const handleCancelAction = useCallback(() => {
    setActionMode(null);
    setSelectedDisplayIds(new Set());
    setSelectedGroupIds(new Set());
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

  // Fetch a display's current group membership IDs from the server. Uses the
  // RTK Query cache when warm; otherwise issues a single paginated request.
  const fetchDisplayGroupIds = useCallback(
    async (displayId: string): Promise<readonly string[]> => {
      const result = await dispatch(
        displaysApi.endpoints.getDisplayGroupsForDisplay.initiate(
          {
            displayId,
            page: 1,
            pageSize: SELECTED_DISPLAY_GROUPS_PAGE_SIZE,
            membership: "member",
          },
          { forceRefetch: false },
        ),
      ).unwrap();
      return result.items.map((g) => g.id);
    },
    [dispatch],
  );

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedGroupId || selectedDisplayIds.size === 0) return;
    setIsExecuting(true);
    try {
      const results = await Promise.allSettled(
        [...selectedDisplayIds].map(async (displayId) => {
          const currentGroupIds = await fetchDisplayGroupIds(displayId);
          const newGroupIds = currentGroupIds.includes(selectedGroupId)
            ? [...currentGroupIds]
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
  }, [
    selectedDisplayIds,
    selectedGroupId,
    setDisplayGroupsMutation,
    fetchDisplayGroupIds,
  ]);

  const handleConfirmRemove = useCallback(async () => {
    if (!selectedGroupId || selectedDisplayIds.size === 0) return;
    setIsExecuting(true);
    try {
      const results = await Promise.allSettled(
        [...selectedDisplayIds].map(async (displayId) => {
          const currentGroupIds = await fetchDisplayGroupIds(displayId);
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
  }, [
    selectedDisplayIds,
    selectedGroupId,
    setDisplayGroupsMutation,
    fetchDisplayGroupIds,
  ]);

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
    setGroupsRightPanePage(1);
  }, []);

  const handleLeftDisplaySearchChange = useCallback((v: string) => {
    setLeftDisplaySearch(v);
    // Infinite query refetches automatically when the q arg changes.
  }, []);

  const handleSelectDisplay = useCallback((displayId: string) => {
    setSelectedDisplayId((prev) => (prev === displayId ? null : displayId));
    setActionMode(null);
    setSelectedGroupIds(new Set());
    setGroupsRightPanePage(1);
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
        // Resolve group names → group IDs in one backend round-trip,
        // creating any missing ones idempotently.
        const names = display.groups
          .map((g) => collapseDisplayGroupWhitespace(g.name))
          .filter((n) => n.length > 0);
        let nextGroupIds: string[] = [];
        if (names.length > 0) {
          const resolved = await resolveDisplayGroupsMutation({
            names,
          }).unwrap();
          nextGroupIds = resolved.items.map((i) => i.id);
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
      resolveDisplayGroupsMutation,
      setDisplayGroupsMutation,
    ],
  );

  return {
    canManageGroups,
    axis,
    handleAxisChange,
    leftGroups,
    isLoading,
    isError,
    hasMoreLeftGroups,
    isFetchingMoreLeftGroups,
    fetchMoreLeftGroups,
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
    isLeftDisplaysLoading,
    hasMoreLeftDisplays,
    isFetchingMoreLeftDisplays,
    fetchMoreLeftDisplays,
    selectedGroupIds,
    groupsForRightPane,
    groupsRightPanePage,
    groupsRightPaneTotal,
    setGroupsRightPanePage,
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
