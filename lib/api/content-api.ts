import { toast } from "sonner";
import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import {
  schedulesApi,
  type ScheduleWindowQuery,
} from "@/lib/api/schedules-api";
import type { FlashTone } from "@/types/content";
import type { RootState } from "@/lib/store";

async function bumpContentNextCache(): Promise<void> {
  try {
    await revalidateWildfireTagsViaRoute(["content-list", "content-options"]);
  } catch {
    // best-effort
  }
}

async function bumpContentDependentNextCache(): Promise<void> {
  try {
    await revalidateWildfireTagsViaRoute([
      "content-list",
      "content-options",
      "playlists",
      "schedules-bootstrap",
    ]);
  } catch {
    // best-effort
  }
}

type ContentListMutable = {
  items: BackendContentListItem[];
  total: number;
  page: number;
  pageSize: number;
};

function contentMatchesListQuery(
  content: BackendContentListItem,
  query: ContentListQuery | void,
): boolean {
  if (query?.ownerId && content.owner.id !== query.ownerId) return false;
  if (query?.status && content.status !== query.status) return false;
  if (query?.type && content.type !== query.type) return false;
  const search = query?.search?.trim().toLowerCase();
  if (search && !content.title.toLowerCase().includes(search)) return false;
  return true;
}

function contentMatchesOptionsQuery(
  content: BackendContent,
  query: ContentOptionsQueryArg,
): boolean {
  if (query?.status && content.status !== query.status) return false;
  if (query?.type && content.type !== query.type) return false;
  const search = query?.q?.trim().toLowerCase();
  if (search && !content.title.toLowerCase().includes(search)) return false;
  return true;
}

function canInsertCreatedContent(query: ContentListQuery | void): boolean {
  return (
    (query?.page ?? 1) === 1 &&
    (query?.sortBy ?? "createdAt") === "createdAt" &&
    (query?.sortDirection ?? "desc") === "desc"
  );
}

function trimContentListToPageSize(draft: ContentListMutable): void {
  const pageSize = draft.pageSize;
  if (pageSize > 0 && draft.items.length > pageSize) {
    draft.items.splice(pageSize);
  }
}

function patchCreatedContentList(
  draft: BackendContentListResponse,
  query: ContentListQuery | void,
  content: BackendContentListItem,
): void {
  if (!contentMatchesListQuery(content, query)) return;
  const d = draft as unknown as ContentListMutable;
  const idx = d.items.findIndex((c) => c.id === content.id);
  if (idx !== -1) {
    d.items[idx] = content;
    return;
  }
  d.total += 1;
  if (!canInsertCreatedContent(query)) return;
  d.items.unshift(content);
  trimContentListToPageSize(d);
}

const PDF_CROP_SUBMIT_WAIT_TIMEOUT_MS = 60_000;

export interface BackendContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
  readonly status: "PROCESSING" | "READY" | "FAILED";
  readonly thumbnailUrl?: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration: number | null;
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly textJsonContent: string | null;
  readonly textHtmlContent: string | null;
  readonly textPreviewText: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: {
    readonly id: string;
    readonly username?: string;
    readonly name: string | null;
  };
}

export type BackendContentListItem = Omit<
  BackendContent,
  "textJsonContent" | "textHtmlContent"
>;

export interface BackendContentJob {
  readonly id: string;
  readonly contentId: string;
  readonly operation: "UPLOAD" | "REPLACE";
  readonly status: "QUEUED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  readonly errorMessage: string | null;
  readonly ownerId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export interface ContentOption {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
  readonly thumbnailUrl?: string;
  readonly textPreviewText?: string | null;
}

/** Cache key for `getContentOptions` (playlist picker SSR uses `PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY`). */
export type ContentOptionsQueryArg = {
  readonly q?: string;
  readonly status?: "PROCESSING" | "READY" | "FAILED";
  readonly type?: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
} | void;

export interface ContentIngestionAcceptedResponse {
  readonly content: BackendContent;
  readonly job: BackendContentJob;
}

export interface BackendContentListResponse {
  readonly items: readonly BackendContentListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ContentListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: "PROCESSING" | "READY" | "FAILED";
  readonly type?: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
  readonly ownerId?: string;
  readonly search?: string;
  readonly sortBy?: "createdAt" | "title" | "fileSize" | "type";
  readonly sortDirection?: "asc" | "desc";
}

export interface UploadContentRequest {
  readonly title: string;
  readonly file: File;
}

export interface ReplaceContentFileRequest {
  readonly id: string;
  readonly file: File;
  readonly title?: string;
}

export interface CreateFlashContentRequest {
  readonly title: string;
  readonly message: string;
  readonly tone: FlashTone;
}

export interface CreateTextContentRequest {
  readonly title: string;
  readonly jsonContent: string;
  readonly htmlContent: string;
}

export interface PdfUploadAcceptedResponse {
  readonly uploadId: string;
  readonly filename: string;
  readonly pdfUrl: string;
  readonly pageCount: number;
  readonly pages: ReadonlyArray<{
    readonly pageNumber: number;
    readonly width: number;
    readonly height: number;
  }>;
}

export interface PdfCropRegion {
  readonly pageNumber: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SubmitPdfCropsRequest {
  readonly uploadId: string;
  readonly regions: readonly PdfCropRegion[];
  readonly contentName?: string;
}

async function patchContentInPlaylistCaches(
  dispatch: (action: unknown) => void,
  getState: () => RootState,
  contentId: string,
  updated: BackendContent,
): Promise<void> {
  const { playlistsApi } = await import("@/lib/api/playlists-api");

  const detailArgs = playlistsApi.util.selectCachedArgsForQuery(
    getState(),
    "getPlaylist",
  );
  for (const pa of detailArgs) {
    dispatch(
      playlistsApi.util.updateQueryData("getPlaylist", pa, (draft) => {
        for (const item of draft.items as {
          content: {
            id: string;
            title: string;
            type: string;
            thumbnailUrl?: string | null;
            textPreviewText?: string | null;
          };
        }[]) {
          if (item.content.id === contentId) {
            item.content.title = updated.title;
            item.content.type = updated.type;
            if (updated.thumbnailUrl !== undefined) {
              item.content.thumbnailUrl = updated.thumbnailUrl;
            }
            item.content.textPreviewText = updated.textPreviewText;
          }
        }
      }),
    );
  }

  const listArgs = playlistsApi.util.selectCachedArgsForQuery(
    getState(),
    "listPlaylists",
  );
  for (const pa of listArgs) {
    dispatch(
      playlistsApi.util.updateQueryData("listPlaylists", pa, (draft) => {
        for (const playlist of draft.items as {
          previewItems: {
            content: {
              id: string;
              title: string;
              type: string;
              thumbnailUrl?: string | null;
              textPreviewText?: string | null;
            };
          }[];
        }[]) {
          for (const item of playlist.previewItems) {
            if (item.content.id === contentId) {
              item.content.title = updated.title;
              item.content.type = updated.type;
              if (updated.thumbnailUrl !== undefined) {
                item.content.thumbnailUrl = updated.thumbnailUrl;
              }
              item.content.textPreviewText = updated.textPreviewText;
            }
          }
        }
      }),
    );
  }
}

export const contentApi = api.injectEndpoints({
  endpoints: (build) => ({
    getContentOptions: build.query<ContentOption[], ContentOptionsQueryArg>({
      keepUnusedDataFor: 600,
      query: (query) => ({
        url: "content/options",
        params: {
          q: query?.q,
          status: query?.status,
          type: query?.type,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<ContentOption[]>(
          response,
          "getContentOptions",
        ),
      providesTags: [{ type: "Content", id: "LIST" }],
    }),
    listContent: build.query<
      BackendContentListResponse,
      ContentListQuery | void
    >({
      query: (query) => ({
        url: "content",
        params: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 20,
          status: query?.status,
          type: query?.type,
          ownerId: query?.ownerId,
          search: query?.search,
          sortBy: query?.sortBy ?? "createdAt",
          sortDirection: query?.sortDirection ?? "desc",
        },
      }),
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendContentListItem>(
          response,
          "listContent",
        ),
      providesTags: createProvidesTags("Content"),
    }),
    getContent: build.query<BackendContent, string>({
      query: (id) => `content/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContent>(response, "getContent"),
      providesTags: (_result, _error, id) => [{ type: "Content" as const, id }],
    }),
    getContentJob: build.query<BackendContentJob, string>({
      query: (id) => `content-jobs/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContentJob>(response, "getContentJob"),
      providesTags: (_result, _error, id) => [
        { type: "ContentJob" as const, id },
      ],
    }),
    createFlashContent: build.mutation<
      BackendContent,
      CreateFlashContentRequest
    >({
      query: (body) => ({
        url: "content/flash",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContent>(
          response,
          "createFlashContent",
        ),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Content", id: "LIST" },
              { type: "Content", id: result.id },
              { type: "Schedule", id: "LIST" },
            ]
          : [
              { type: "Content", id: "LIST" },
              { type: "Schedule", id: "LIST" },
            ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: created } = await queryFulfilled;
          const argsList = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "listContent",
          );
          for (const args of argsList) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => {
                patchCreatedContentList(
                  draft,
                  args,
                  created as BackendContentListItem,
                );
              }),
            );
          }
          const optionArgs = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "getContentOptions",
          );
          for (const oa of optionArgs) {
            if (!contentMatchesOptionsQuery(created, oa)) continue;
            dispatch(
              contentApi.util.updateQueryData(
                "getContentOptions",
                oa,
                (draft) => {
                  draft.push({
                    id: created.id,
                    title: created.title,
                    type: created.type,
                    thumbnailUrl: created.thumbnailUrl,
                  });
                },
              ),
            );
          }
          const scheduleEntries = schedulesApi.util.selectInvalidatedBy(
            getState(),
            [{ type: "Schedule", id: "LIST" }],
          );
          for (const entry of scheduleEntries) {
            if (entry.endpointName === "getSchedulesBootstrap") {
              dispatch(
                schedulesApi.util.updateQueryData(
                  "getSchedulesBootstrap",
                  entry.originalArgs as ScheduleWindowQuery,
                  (draft) => {
                    (
                      draft.flashContentOptions as {
                        id: string;
                        title: string;
                        type: "FLASH";
                      }[]
                    ).push({
                      id: created.id,
                      title: created.title,
                      type: "FLASH",
                    });
                  },
                ),
              );
            }
          }
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          await bumpContentDependentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    createTextContent: build.mutation<BackendContent, CreateTextContentRequest>(
      {
        query: (body) => ({
          url: "content/text",
          method: "POST",
          body,
        }),
        transformResponse: (response) =>
          parseApiResponseDataSafe<BackendContent>(
            response,
            "createTextContent",
          ),
        invalidatesTags: (result) =>
          result
            ? [
                { type: "Content", id: "LIST" },
                { type: "Content", id: result.id },
              ]
            : [{ type: "Content", id: "LIST" }],
        async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
          try {
            const { data: created } = await queryFulfilled;
            const argsList = contentApi.util.selectCachedArgsForQuery(
              getState(),
              "listContent",
            );
            for (const args of argsList) {
              dispatch(
                contentApi.util.updateQueryData(
                  "listContent",
                  args,
                  (draft) => {
                    patchCreatedContentList(
                      draft,
                      args,
                      created as BackendContentListItem,
                    );
                  },
                ),
              );
            }
            const optionArgs = contentApi.util.selectCachedArgsForQuery(
              getState(),
              "getContentOptions",
            );
            for (const oa of optionArgs) {
              if (!contentMatchesOptionsQuery(created, oa)) continue;
              dispatch(
                contentApi.util.updateQueryData(
                  "getContentOptions",
                  oa,
                  (draft) => {
                    draft.push({
                      id: created.id,
                      title: created.title,
                      type: created.type,
                      thumbnailUrl: created.thumbnailUrl,
                      textPreviewText: created.textPreviewText,
                    });
                  },
                ),
              );
            }
            await bumpContentDependentNextCache();
          } catch {
            // mutation failed
          }
        },
      },
    ),
    uploadContent: build.mutation<
      ContentIngestionAcceptedResponse,
      UploadContentRequest
    >({
      query: ({ title, file }) => {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("file", file);
        return {
          url: "content",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response) =>
        parseApiResponseDataSafe<ContentIngestionAcceptedResponse>(
          response,
          "uploadContent",
        ),
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Content", id: "LIST" },
              { type: "Content", id: result.content.id },
              { type: "ContentJob" as const, id: result.job.id },
            ]
          : [{ type: "Content", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: result } = await queryFulfilled;
          const argsList = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "listContent",
          );
          for (const args of argsList) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => {
                patchCreatedContentList(
                  draft,
                  args,
                  result.content as BackendContentListItem,
                );
              }),
            );
          }
          await bumpContentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    uploadPdf: build.mutation<PdfUploadAcceptedResponse, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("file", file);
        return {
          url: "content/pdf-crops",
          method: "POST",
          body: formData,
        };
      },
      transformResponse: (response) =>
        parseApiResponseDataSafe<PdfUploadAcceptedResponse>(
          response,
          "uploadPdf",
        ),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpContentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    submitPdfCrops: build.mutation<
      readonly BackendContent[],
      SubmitPdfCropsRequest
    >({
      query: ({ uploadId, regions, contentName }) => ({
        url: `content/pdf-crops/${uploadId}/submit`,
        method: "POST",
        body: { crops: regions, contentName },
      }),
      transformResponse: (response) => {
        const body = parseApiResponseDataSafe<{
          readonly items: readonly BackendContent[];
        }>(response, "submitPdfCrops");
        return body.items;
      },
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        let timedOut = false;
        const timeoutId = setTimeout(() => {
          timedOut = true;
          toast.error(
            "PDF processing is taking longer than expected. You can try uploading again, or return to the crop page and click Create again if it's still open.",
          );
        }, PDF_CROP_SUBMIT_WAIT_TIMEOUT_MS);

        try {
          const { data: items } = await queryFulfilled;
          clearTimeout(timeoutId);

          const state = getState();
          const argsList = contentApi.util.selectCachedArgsForQuery(
            state,
            "listContent",
          );
          for (const args of argsList) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => {
                for (const item of items) {
                  patchCreatedContentList(
                    draft,
                    args,
                    item as BackendContentListItem,
                  );
                }
              }),
            );
          }

          if (!timedOut) {
            const count = items.length;
            toast.success(
              count === 1
                ? "PDF content created successfully (1 item)."
                : `PDF content created successfully (${count} items).`,
            );
          }
          dispatch(api.util.invalidateTags([{ type: "Content", id: "LIST" }]));
          await bumpContentDependentNextCache();
        } catch {
          clearTimeout(timeoutId);
          if (!timedOut) {
            toast.error("Failed to create PDF content. Please try again.");
          }
        }
      },
    }),
    cancelPdfUpload: build.mutation<void, string>({
      query: (uploadId) => ({
        url: `content/pdf-crops/${uploadId}`,
        method: "DELETE",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(api.util.invalidateTags([{ type: "Schedule", id: "LIST" }]));
          await bumpContentDependentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    deleteContent: build.mutation<void, string>({
      query: (id) => ({
        url: `content/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Content", id },
        { type: "Content", id: "LIST" },
        { type: "Playlist", id: "LIST" },
        { type: "Schedule", id: "LIST" },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          const argsList = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "listContent",
          );
          for (const args of argsList) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => {
                patchPaginatedListById(draft, "remove", {
                  id,
                } as BackendContentListItem);
              }),
            );
          }
          const optionArgs = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "getContentOptions",
          );
          for (const oa of optionArgs) {
            dispatch(
              contentApi.util.updateQueryData(
                "getContentOptions",
                oa,
                (draft) => draft.filter((c) => c.id !== id),
              ),
            );
          }
          const scheduleEntries = schedulesApi.util.selectInvalidatedBy(
            getState(),
            [{ type: "Schedule", id: "LIST" }],
          );
          for (const entry of scheduleEntries) {
            if (entry.endpointName === "getSchedulesBootstrap") {
              dispatch(
                schedulesApi.util.updateQueryData(
                  "getSchedulesBootstrap",
                  entry.originalArgs as ScheduleWindowQuery,
                  (draft) => {
                    const opts = draft.flashContentOptions as {
                      id: string;
                      title: string;
                      type: "FLASH";
                    }[];
                    const idx = opts.findIndex((o) => o.id === id);
                    if (idx !== -1) opts.splice(idx, 1);
                  },
                ),
              );
            }
          }
          await bumpContentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    updateContent: build.mutation<
      BackendContent,
      {
        readonly id: string;
        readonly title?: string;
        readonly flashMessage?: string;
        readonly flashTone?: FlashTone;
        readonly textJsonContent?: string;
        readonly textHtmlContent?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `content/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContent>(response, "updateContent"),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: "Content", id },
              { type: "Content", id: result.id },
              { type: "Content", id: "LIST" },
              { type: "Playlist", id: "LIST" },
              { type: "Schedule", id: "LIST" },
            ]
          : [
              { type: "Content", id },
              { type: "Content", id: "LIST" },
            ],
      async onQueryStarted({ id }, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: updated } = await queryFulfilled;
          const argsList = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "listContent",
          );
          for (const args of argsList) {
            dispatch(
              contentApi.util.updateQueryData("listContent", args, (draft) => {
                const items = draft.items as BackendContentListItem[];
                const idx = items.findIndex((x) => x.id === updated.id);
                if (idx !== -1) {
                  items[idx] = {
                    ...(updated as unknown as BackendContentListItem),
                    thumbnailUrl:
                      updated.thumbnailUrl ?? items[idx].thumbnailUrl,
                  };
                }
              }),
            );
          }
          dispatch(
            contentApi.util.updateQueryData("getContent", id, () => updated),
          );
          const optionArgs = contentApi.util.selectCachedArgsForQuery(
            getState(),
            "getContentOptions",
          );
          for (const oa of optionArgs) {
            dispatch(
              contentApi.util.updateQueryData(
                "getContentOptions",
                oa,
                (draft) => {
                  const idx = draft.findIndex((c) => c.id === id);
                  if (idx !== -1) {
                    draft[idx] = {
                      id: updated.id,
                      title: updated.title,
                      type: updated.type,
                      thumbnailUrl:
                        updated.thumbnailUrl ?? draft[idx].thumbnailUrl,
                      textPreviewText: updated.textPreviewText,
                    };
                  }
                },
              ),
            );
          }
          await patchContentInPlaylistCaches(dispatch, getState, id, updated);
          await bumpContentDependentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    replaceContentFile: build.mutation<
      ContentIngestionAcceptedResponse,
      ReplaceContentFileRequest
    >({
      query: ({ id, file, title }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (title !== undefined) {
          formData.append("title", title);
        }
        return {
          url: `content/${id}/file`,
          method: "PUT",
          body: formData,
        };
      },
      transformResponse: (response) =>
        parseApiResponseDataSafe<ContentIngestionAcceptedResponse>(
          response,
          "replaceContentFile",
        ),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: "Content", id: "LIST" },
              { type: "Content", id },
              { type: "Content", id: result.content.id },
              { type: "ContentJob" as const, id: result.job.id },
            ]
          : [
              { type: "Content", id: "LIST" },
              { type: "Content", id },
            ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpContentDependentNextCache();
        } catch {
          // mutation failed
        }
      },
    }),
    getContentFileUrl: build.query<{ downloadUrl: string }, string>({
      query: (id) => `content/${id}/file`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<{ downloadUrl: string }>(
          response,
          "getContentFileUrl",
        ),
    }),
  }),
});

export const {
  useGetContentOptionsQuery,
  useListContentQuery,
  useLazyListContentQuery,
  useGetContentQuery,
  useGetContentJobQuery,
  useCreateFlashContentMutation,
  useCreateTextContentMutation,
  useUploadContentMutation,
  useUploadPdfMutation,
  useSubmitPdfCropsMutation,
  useCancelPdfUploadMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
  useReplaceContentFileMutation,
  useLazyGetContentFileUrlQuery,
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
} = contentApi;
