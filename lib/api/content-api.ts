import { createApi } from "@reduxjs/toolkit/query/react";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import type { FlashTone } from "@/types/content";

export interface BackendContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF" | "FLASH";
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
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly createdAt: string;
  readonly createdBy: {
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
  readonly createdById: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
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
  readonly type?: "IMAGE" | "VIDEO" | "PDF" | "FLASH";
  readonly search?: string;
  readonly sortBy?: "createdAt" | "title" | "fileSize" | "type" | "pageNumber";
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

export interface BackendFlashActivation {
  readonly id: string;
  readonly contentId: string;
  readonly targetDisplayId: string;
  readonly message: string;
  readonly tone: FlashTone;
  readonly status: "ACTIVE" | "STOPPED" | "EXPIRED";
  readonly startedAt: string;
  readonly endsAt: string;
  readonly stoppedAt: string | null;
  readonly stoppedReason: string | null;
  readonly createdById: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly replacementCount: number;
}

export interface BackendFlashActivationResponse {
  readonly content: BackendContent;
  readonly activation: BackendFlashActivation;
  readonly replacedActivation?: BackendFlashActivation | null;
}

export interface ActivateFlashContentRequest {
  readonly message: string;
  readonly targetDisplayId: string;
  readonly durationSeconds: number;
  readonly tone: FlashTone;
  readonly conflictDecision?: "prompt" | "replace" | "keep";
  readonly expectedActiveActivationId?: string;
}

export interface StopFlashContentRequest {
  readonly reason?: string;
}

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery,
  tagTypes: ["Content", "ContentJob", "Flash"],
  endpoints: (build) => ({
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
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<BackendContent>(
          response,
          "listContent",
        );
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.per_page,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Content" as const,
                id,
              })),
              { type: "Content", id: "LIST" },
            ]
          : [{ type: "Content", id: "LIST" }],
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
    getActiveFlashContent: build.query<
      BackendFlashActivationResponse | null,
      void
    >({
      query: () => "content/flash/active",
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendFlashActivationResponse | null>(
          response,
          "getActiveFlashContent",
        ),
      providesTags: [{ type: "Flash", id: "ACTIVE" }],
    }),
    activateFlashContent: build.mutation<
      BackendFlashActivationResponse,
      ActivateFlashContentRequest
    >({
      query: (body) => ({
        url: "content/flash/activate",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendFlashActivationResponse>(
          response,
          "activateFlashContent",
        ),
      invalidatesTags: [
        { type: "Flash", id: "ACTIVE" },
        { type: "Content", id: "LIST" },
      ],
    }),
    stopActiveFlashContent: build.mutation<
      BackendFlashActivation,
      StopFlashContentRequest | void
    >({
      query: (body) => ({
        url: "content/flash/active/stop",
        method: "POST",
        body: body ?? {},
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendFlashActivation>(
          response,
          "stopActiveFlashContent",
        ),
      invalidatesTags: [{ type: "Flash", id: "ACTIVE" }],
    }),
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
        readonly title: string;
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
  useListContentQuery,
  useLazyListContentQuery,
  useGetContentQuery,
  useGetContentJobQuery,
  useGetActiveFlashContentQuery,
  useActivateFlashContentMutation,
  useStopActiveFlashContentMutation,
  useUploadContentMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
  useSetContentExclusionMutation,
  useReplaceContentFileMutation,
  useLazyGetContentFileUrlQuery,
  useLazyGetContentJobQuery,
} = contentApi;
