import { createApi } from "@reduxjs/toolkit/query/react";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import type { FlashTone } from "@/types/content";

export interface BackendContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF" | "FLASH" | "TEXT";
  readonly kind: "ROOT" | "PAGE";
  readonly status: "PROCESSING" | "READY" | "FAILED";
  readonly thumbnailUrl?: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly parentContentId: string | null;
  readonly pageNumber: number | null;
  readonly pageCount: number | null;
  readonly isExcluded: boolean;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration: number | null;
  readonly scrollPxPerSecond: number | null;
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly textJsonContent: string | null;
  readonly textHtmlContent: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: {
    readonly id: string;
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
  readonly type: "IMAGE" | "VIDEO" | "PDF" | "FLASH" | "TEXT";
}

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
  readonly parentId?: string;
  readonly status?: "PROCESSING" | "READY" | "FAILED";
  readonly type?: "IMAGE" | "VIDEO" | "PDF" | "FLASH" | "TEXT";
  readonly search?: string;
  readonly sortBy?: "createdAt" | "title" | "fileSize" | "type" | "pageNumber";
  readonly sortDirection?: "asc" | "desc";
}

export interface UploadContentRequest {
  readonly title: string;
  readonly file: File;
  readonly scrollPxPerSecond?: number;
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

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery,
  tagTypes: ["Content", "ContentJob"],
  endpoints: (build) => ({
    getContentOptions: build.query<
      ContentOption[],
      {
        readonly q?: string;
        readonly status?: "PROCESSING" | "READY" | "FAILED";
        readonly type?: "IMAGE" | "VIDEO" | "PDF" | "FLASH" | "TEXT";
      } | void
    >({
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
          parentId: query?.parentId,
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
      invalidatesTags: [{ type: "Content", id: "LIST" }],
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
        invalidatesTags: [{ type: "Content", id: "LIST" }],
      },
    ),
    uploadContent: build.mutation<
      ContentIngestionAcceptedResponse,
      UploadContentRequest
    >({
      query: ({ title, file, scrollPxPerSecond }) => {
        const formData = new FormData();
        formData.append("title", title);
        if (scrollPxPerSecond !== undefined) {
          formData.append("scrollPxPerSecond", String(scrollPxPerSecond));
        }
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
    }),
    deleteContent: build.mutation<void, string>({
      query: (id) => ({
        url: `content/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Content", id: "LIST" },
        { type: "Content", id },
      ],
    }),
    updateContent: build.mutation<
      BackendContent,
      {
        readonly id: string;
        readonly title?: string;
        readonly flashMessage?: string;
        readonly flashTone?: FlashTone;
        readonly scrollPxPerSecond?: number | null;
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
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Content", id: "LIST" },
        { type: "Content", id },
      ],
    }),
    setContentExclusion: build.mutation<
      BackendContent,
      {
        readonly id: string;
        readonly isExcluded: boolean;
      }
    >({
      query: ({ id, isExcluded }) => ({
        url: `content/${id}/exclusion`,
        method: "PATCH",
        body: { isExcluded },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContent>(
          response,
          "setContentExclusion",
        ),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Content", id: "LIST" },
        { type: "Content", id },
      ],
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
  useDeleteContentMutation,
  useUpdateContentMutation,
  useSetContentExclusionMutation,
  useReplaceContentFileMutation,
  useLazyGetContentFileUrlQuery,
  useLazyGetContentJobQuery,
  useLazyGetContentQuery,
} = contentApi;
