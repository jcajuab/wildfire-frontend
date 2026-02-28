import { createApi } from "@reduxjs/toolkit/query/react";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";

export interface BackendContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF";
  readonly status: "DRAFT" | "IN_USE";
  readonly thumbnailUrl?: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration: number | null;
  readonly createdAt: string;
  readonly createdBy: {
    readonly id: string;
    readonly name: string | null;
  };
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
  readonly status?: "DRAFT" | "IN_USE";
  readonly type?: "IMAGE" | "VIDEO" | "PDF";
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
  readonly status?: "DRAFT" | "IN_USE";
}

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery,
  tagTypes: ["Content"],
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
      providesTags: (_result, _error, id) => [{ type: "Content", id }],
    }),
    uploadContent: build.mutation<BackendContent, UploadContentRequest>({
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
        parseApiResponseDataSafe<BackendContent>(response, "uploadContent"),
      invalidatesTags: [{ type: "Content", id: "LIST" }],
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
        readonly status?: "DRAFT" | "IN_USE";
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
      BackendContent,
      ReplaceContentFileRequest
    >({
      query: ({ id, file, title, status }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (title !== undefined) {
          formData.append("title", title);
        }
        if (status !== undefined) {
          formData.append("status", status);
        }
        return {
          url: `content/${id}/file`,
          method: "PUT",
          body: formData,
        };
      },
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendContent>(response, "replaceContentFile"),
      invalidatesTags: (_result, _error, { id }) => [
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
  useGetContentQuery,
  useUploadContentMutation,
  useDeleteContentMutation,
  useUpdateContentMutation,
  useReplaceContentFileMutation,
  useLazyGetContentFileUrlQuery,
} = contentApi;
