import { type BackendContent, contentApi } from "@/lib/api/content-api";
import type { AppDispatch, RootState } from "@/lib/store";

/**
 * Replaces a content row in all cached listContent queries and upserts getContent,
 * e.g. after GET /content/:id returns presigned thumbnailUrl and dimensions.
 */
export function mergeEnrichedContentIntoCaches(
  dispatch: AppDispatch,
  getState: () => RootState,
  content: BackendContent,
): void {
  const state = getState();
  const listArgs = contentApi.util.selectCachedArgsForQuery(
    state,
    "listContent",
  );
  for (const args of listArgs) {
    dispatch(
      contentApi.util.updateQueryData("listContent", args, (draft) => ({
        ...draft,
        items: draft.items.map((c) => (c.id === content.id ? content : c)),
      })),
    );
  }
  dispatch(
    contentApi.util.updateQueryData("getContent", content.id, () => content),
  );
}

/** Shallow status-only patch when full GET is unavailable. */
export function patchContentStatusInCaches(
  dispatch: AppDispatch,
  getState: () => RootState,
  contentId: string,
  status: BackendContent["status"],
): void {
  const state = getState();
  const listArgs = contentApi.util.selectCachedArgsForQuery(
    state,
    "listContent",
  );
  for (const args of listArgs) {
    dispatch(
      contentApi.util.updateQueryData("listContent", args, (draft) => ({
        ...draft,
        items: draft.items.map((c) =>
          c.id === contentId ? { ...c, status } : c,
        ),
      })),
    );
  }
  dispatch(
    contentApi.util.updateQueryData("getContent", contentId, (draft) => ({
      ...draft,
      status,
    })),
  );
}
