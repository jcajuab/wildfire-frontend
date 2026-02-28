import { createApi } from "@reduxjs/toolkit/query/react";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";

export interface BackendSchedule {
  readonly id: string;
  readonly name: string;
  readonly playlistId: string;
  readonly displayId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly priority: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly playlist: {
    readonly id: string;
    readonly name: string | null;
  };
  readonly display: {
    readonly id: string;
    readonly name: string | null;
  };
}

export interface BackendScheduleListResponse {
  readonly items: readonly BackendSchedule[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CreateScheduleRequest {
  readonly name: string;
  readonly playlistId: string;
  readonly displayId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly priority: number;
  readonly isActive?: boolean;
}

export interface UpdateScheduleRequest {
  readonly id: string;
  readonly name?: string;
  readonly playlistId?: string;
  readonly displayId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly priority?: number;
  readonly isActive?: boolean;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export const schedulesApi = createApi({
  reducerPath: "schedulesApi",
  baseQuery,
  tagTypes: ["Schedule"],
  endpoints: (build) => ({
    listSchedules: build.query<BackendScheduleListResponse, void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        const pageSize = PAGE_SIZE;
        let page = 1;
        let total = 0;
        const allItems: BackendSchedule[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: {
                status: 500,
                data: "Failed to load schedules: pagination limit reached.",
              },
            };
          }
          const result = await baseQueryFn({
            url: "schedules",
            params: { page, pageSize },
          });
          if (result.error) {
            return { error: result.error };
          }

          const response = parseApiListResponseSafe<BackendSchedule>(
            result.data,
            "listSchedules",
          );
          total = response.meta.total;
          allItems.push(...response.data);

          if (allItems.length >= total || response.data.length === 0) {
            break;
          }
          page += 1;
        }

        return {
          data: {
            items: allItems,
            total,
            page: 1,
            pageSize: PAGE_SIZE,
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Schedule" as const,
                id,
              })),
              { type: "Schedule", id: "LIST" },
            ]
          : [{ type: "Schedule", id: "LIST" }],
    }),
    getSchedule: build.query<BackendSchedule, string>({
      query: (id) => `schedules/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendSchedule>(response, "getSchedule"),
      providesTags: (_result, _error, id) => [{ type: "Schedule", id }],
    }),
    createSchedule: build.mutation<BackendSchedule, CreateScheduleRequest>({
      query: (body) => ({
        url: "schedules",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendSchedule>(response, "createSchedule"),
      invalidatesTags: [{ type: "Schedule", id: "LIST" }],
    }),
    updateSchedule: build.mutation<BackendSchedule, UpdateScheduleRequest>({
      query: ({ id, ...body }) => ({
        url: `schedules/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendSchedule>(response, "updateSchedule"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Schedule", id: "LIST" },
        { type: "Schedule", id },
      ],
    }),
    deleteSchedule: build.mutation<void, string>({
      query: (id) => ({
        url: `schedules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Schedule", id: "LIST" },
        { type: "Schedule", id },
      ],
    }),
  }),
});

export const {
  useListSchedulesQuery,
  useGetScheduleQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} = schedulesApi;
