"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";

import { useCan } from "@/hooks/use-can";
import {
  type ContentListQuery,
  useListContentQuery,
} from "@/lib/api/content-api";
import { mapContentListItemToPlaylistSelectable } from "@/lib/playlists/map-content-option-to-selectable";
import type { PlaylistSelectableContent } from "./create-playlist-form";

const PLAYLIST_CONTENT_LIBRARY_PAGE_SIZE = 20;

export interface PlaylistContentLibraryState {
  readonly availableContent: readonly PlaylistSelectableContent[];
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly isLoading: boolean;
  readonly isFetching: boolean;
  readonly hasMore: boolean;
  readonly onLoadMore: () => void;
}

interface PlaylistContentLibraryReducerState {
  readonly search: string;
  readonly page: number;
  readonly availableContent: readonly PlaylistSelectableContent[];
}

type PlaylistContentLibraryAction =
  | { readonly type: "search"; readonly value: string }
  | { readonly type: "loadMore" }
  | {
      readonly type: "pageLoaded";
      readonly page: number;
      readonly items: readonly PlaylistSelectableContent[];
    };

function playlistContentLibraryReducer(
  state: PlaylistContentLibraryReducerState,
  action: PlaylistContentLibraryAction,
): PlaylistContentLibraryReducerState {
  switch (action.type) {
    case "search":
      return {
        search: action.value,
        page: 1,
        availableContent: [],
      };
    case "loadMore":
      return {
        ...state,
        page: state.page + 1,
      };
    case "pageLoaded": {
      if (action.page === 1) {
        return {
          ...state,
          availableContent: action.items,
        };
      }
      const next = [...state.availableContent];
      const seen = new Set(next.map((item) => item.id));
      for (const item of action.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          next.push(item);
        }
      }
      return {
        ...state,
        availableContent: next,
      };
    }
  }
}

export function usePlaylistContentLibrary(): PlaylistContentLibraryState {
  const canReadContent = useCan("content:read");
  const [state, dispatch] = useReducer(playlistContentLibraryReducer, {
    search: "",
    page: 1,
    availableContent: [],
  });
  const normalizedSearch = state.search.trim();

  const queryArgs = useMemo<ContentListQuery>(
    () => ({
      page: state.page,
      pageSize: PLAYLIST_CONTENT_LIBRARY_PAGE_SIZE,
      status: "READY",
      excludeType: "FLASH",
      search: normalizedSearch.length > 0 ? normalizedSearch : undefined,
      sortBy: "title",
      sortDirection: "asc",
    }),
    [normalizedSearch, state.page],
  );

  const { currentData, isLoading, isFetching } = useListContentQuery(
    queryArgs,
    {
      skip: !canReadContent,
    },
  );

  useEffect(() => {
    if (!currentData) return;
    const mapped = currentData.items
      .map(mapContentListItemToPlaylistSelectable)
      .filter((item): item is PlaylistSelectableContent => item != null);

    dispatch({
      type: "pageLoaded",
      page: currentData.page,
      items: mapped,
    });
  }, [currentData]);

  const hasMore = currentData
    ? currentData.page * currentData.pageSize < currentData.total
    : false;

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isFetching) return;
    dispatch({ type: "loadMore" });
  }, [hasMore, isFetching]);

  const handleSearchChange = useCallback((value: string) => {
    dispatch({ type: "search", value });
  }, []);

  return {
    availableContent: state.availableContent,
    search: state.search,
    onSearchChange: handleSearchChange,
    isLoading: isLoading && state.availableContent.length === 0,
    isFetching,
    hasMore,
    onLoadMore: handleLoadMore,
  };
}
