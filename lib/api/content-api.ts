import { createApi } from "@reduxjs/toolkit/query/react";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import type { FlashTone } from "@/types/content";

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
        readonly type?: "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
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
      transformResponse: (response) =>
        parseApiResponseDataSafe<readonly BackendContent[]>(
          response,
          "submitPdfCrops",
        ),
      invalidatesTags: [{ type: "Content", id: "LIST" }],
    }),
    cancelPdfUpload: build.mutation<void, string>({
      query: (uploadId) => ({
        url: `content/pdf-crops/${uploadId}`,
        method: "DELETE",
      }),
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
