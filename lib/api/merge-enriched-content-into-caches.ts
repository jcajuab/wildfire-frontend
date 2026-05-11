import {
  type BackendContent,
  type BackendContentListItem,
  contentApi,
  contentMatchesOptionsQuery,
  upsertContentIntoListDraft,
} from "@/lib/api/content-api";
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
      contentApi.util.updateQueryData("listContent", args, (draft) => {
        upsertContentIntoListDraft(
          draft,
          args,
          content as BackendContentListItem,
        );
      }),
    );
  }
  dispatch(
    contentApi.util.updateQueryData("getContent", content.id, () => content),
  );
  const optionArgs = contentApi.util.selectCachedArgsForQuery(
    getState(),
    "getContentOptions",
  );
  for (const oa of optionArgs) {
    dispatch(
      contentApi.util.updateQueryData("getContentOptions", oa, (draft) => {
        const idx = draft.findIndex((c) => c.id === content.id);
        if (!contentMatchesOptionsQuery(content, oa)) {
          if (idx !== -1) draft.splice(idx, 1);
          return;
        }
        const option = {
          id: content.id,
          title: content.title,
          type: content.type,
          thumbnailUrl: content.thumbnailUrl,
          textPreviewText: content.textPreviewText,
        };
        if (idx !== -1) {
          draft[idx] = option;
        } else {
          draft.push(option);
        }
      }),
    );
  }
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
