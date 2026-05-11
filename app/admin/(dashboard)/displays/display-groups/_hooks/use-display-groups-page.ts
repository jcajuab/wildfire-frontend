"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { useDebounce } from "@/hooks/use-debounce";
import { useCan } from "@/hooks/use-can";
import {
  displaysApi,
  useGetDisplaysBootstrapQuery,
  useGetDisplaysQuery,
  useGetDisplayGroupsInfiniteQuery,
  useSetDisplayGroupsMutation,
  useCreateDisplayGroupMutation,
  useUpdateDisplayGroupMutation,
  type BackendDisplay,
  type DisplayGroup,
  type DisplaysBootstrapResponse,
  type DisplaysListQuery,
} from "@/lib/api/displays-api";
import { useAppDispatch } from "@/lib/hooks";
import { DISPLAYS_BOOTSTRAP_PAGE_SIZE } from "@/lib/displays-search-params";
import { ADMIN_RESOURCE_PAGE_SIZE } from "@/lib/admin-pagination";
import { collapseDisplayGroupWhitespace } from "@/lib/display-group-normalization";

export const DISPLAY_PAGE_SIZE = ADMIN_RESOURCE_PAGE_SIZE;
export const GROUP_PAGE_SIZE = ADMIN_RESOURCE_PAGE_SIZE;
// Internal query for "all groups for a single display" — display can belong
// to many groups but rarely more than a few dozen; 100 matches the backend's
// pageSize cap so requests don't 422.
const SELECTED_DISPLAY_GROUPS_PAGE_SIZE = 100;

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
  const debouncedGroupSearch = useDebounce(groupSearch, 500);

  // Bypass debounce when search is cleared so the unfiltered cache activates
  // immediately rather than waiting 500 ms on the stale filtered key.
  const effectiveGroupQ =
    groupSearch.trim() === "" ? undefined : debouncedGroupSearch || undefined;

  // ---- Left pane "By group": infinite-scroll groups list ----
  // refetchOnMountOrArgChange forces a fresh page-1 fetch every time `q`
  // changes (incl. clearing back to ""), so a previously-cached unfiltered
  // entry can never serve stale post-mutation data.
  const groupsInfinite = useGetDisplayGroupsInfiniteQuery(
    {
      pageSize: GROUP_PAGE_SIZE,
      q: effectiveGroupQ,
      sortBy: "count",
      sortDirection: "desc",
    },
    { refetchOnMountOrArgChange: true },
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

  const displayTotal = !selectedGroupId
    ? 0
    : actionMode === "add"
      ? (addModeDisplaysData?.total ?? 0)
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
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(
          `${succeeded} display${succeeded !== 1 ? "s" : ""} added to group.`,
        );
      } else {
        toast.warning(`${succeeded} added, ${failed} failed. Try again.`);
      }
    } finally {
      dispatch(
        displaysApi.util.invalidateTags([{ type: "DisplayGroup", id: "LIST" }]),
      );
      setIsExecuting(false);
      setActionMode(null);
      setSelectedDisplayIds(new Set());
    }
  }, [
    dispatch,
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
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(
          `${succeeded} display${succeeded !== 1 ? "s" : ""} removed from group.`,
        );
      } else {
        toast.warning(`${succeeded} removed, ${failed} failed. Try again.`);
      }
    } finally {
      dispatch(
        displaysApi.util.invalidateTags([{ type: "DisplayGroup", id: "LIST" }]),
      );
      setIsExecuting(false);
      setActionMode(null);
      setSelectedDisplayIds(new Set());
    }
  }, [
    dispatch,
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

  return {
    canManageGroups,
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
