import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const SESSION_KEY = "wildfire_session";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (typeof url !== "string" || url === "") {
    return "";
  }
  return url.replace(/\/$/, "");
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { token?: string };
    return typeof data.token === "string" ? data.token : null;
  } catch {
    return null;
  }
}

const baseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  prepareHeaders(headers) {
    const token = getToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export interface BackendContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF";
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
}

export interface UploadContentRequest {
  readonly title: string;
  readonly file: File;
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
          pageSize: query?.pageSize ?? 100,
        },
      }),
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
  }),
});

export const {
  useListContentQuery,
  useGetContentQuery,
  useUploadContentMutation,
  useDeleteContentMutation,
} = contentApi;
