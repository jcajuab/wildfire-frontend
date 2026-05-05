import { toast } from "sonner";
import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import type { FlashTone } from "@/types/content";

async function bumpContentNextCache(): Promise<void> {
  try {
    await revalidateWildfireTagsViaRoute(["content-list", "content-options"]);
  } catch {
    // best-effort
  }
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
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: {
    readonly id: string;
    readonly username?: string;
    readonly name: string | null;
  };
}

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
  readonly items: readonly BackendContent[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface ContentListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: "PROCESSING" | "READY" | "FAILED";
  readonly type?: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
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
          search: query?.search,
          sortBy: query?.sortBy ?? "createdAt",
          sortDirection: query?.sortDirection ?? "desc",
        },
      }),
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendContent>(response, "listContent"),
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
                patchPaginatedListById(draft, "add", created, {
                  position: "start",
                });
              }),
            );
          }
          await bumpContentNextCache();
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
                    patchPaginatedListById(draft, "add", created, {
                      position: "start",
                    });
                  },
                ),
              );
            }
            await bumpContentNextCache();
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
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
                  patchPaginatedListById(draft, "add", item, {
                    position: "start",
                  });
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
          await bumpContentNextCache();
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          await bumpContentNextCache();
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
      invalidatesTags: (_result, _error, id) => [{ type: "Content", id }],
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
                } as BackendContent);
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
                patchPaginatedListById(draft, "update", updated);
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
                    };
                  }
                },
              ),
            );
          }
          await bumpContentNextCache();
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
          await bumpContentNextCache();
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
