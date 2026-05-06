"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import {
  displaysApi,
  useGetDisplaysBootstrapQuery,
  useGetDisplaysQuery,
  useSetDisplayGroupsMutation,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  type BackendDisplay,
  type DisplayGroup,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import { collapseDisplayGroupWhitespace } from "@/lib/display-group-normalization";

export const DISPLAY_PAGE_SIZE = 12;

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

  const hasInitialData = initialData != null;

  const {
    data: queriedData,
    isLoading: queryIsLoading,
    isError,
  } = useGetDisplaysBootstrapQuery(BOOTSTRAP_QUERY, {
    skip: hasInitialData,
  });

  const cachedData = displaysApi.endpoints.getDisplaysBootstrap.useQueryState(
    BOOTSTRAP_QUERY,
    { skip: !hasInitialData },
  );

  const bootstrap = queriedData ?? cachedData.data ?? initialData;
  const isLoading = bootstrap == null && (hasInitialData ? false : queryIsLoading);

  const [setDisplayGroupsMutation] = useSetDisplayGroupsMutation();
  const [createDisplayGroupMutation, { isLoading: isCreatePending }] =
    useCreateDisplayGroupMutation();
  const [updateDisplayGroupMutation, { isLoading: isRenamePending }] =
    useUpdateDisplayGroupMutation();

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

  const debouncedDisplaySearch = useDebounce(displaySearch, 500);

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

  return {
    canManageGroups,
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
