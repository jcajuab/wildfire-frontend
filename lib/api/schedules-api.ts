import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";

export interface BackendSchedule {
  readonly id: string;
  readonly name: string;
  readonly playlistId: string;
  readonly deviceId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly daysOfWeek: readonly number[];
  readonly priority: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly playlist: {
    readonly id: string;
    readonly name: string | null;
  };
  readonly device: {
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
  readonly deviceId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly daysOfWeek: readonly number[];
  readonly priority: number;
  readonly isActive?: boolean;
}

export interface UpdateScheduleRequest {
  readonly id: string;
  readonly name?: string;
  readonly playlistId?: string;
  readonly deviceId?: string;
  readonly startTime?: string;
  readonly endTime?: string;
  readonly daysOfWeek?: readonly number[];
  readonly priority?: number;
  readonly isActive?: boolean;
}

export const schedulesApi = createApi({
  reducerPath: "schedulesApi",
  baseQuery,
  tagTypes: ["Schedule"],
  endpoints: (build) => ({
    listSchedules: build.query<BackendScheduleListResponse, void>({
      query: () => "schedules",
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
      providesTags: (_result, _error, id) => [{ type: "Schedule", id }],
    }),
    createSchedule: build.mutation<BackendSchedule, CreateScheduleRequest>({
      query: (body) => ({
        url: "schedules",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Schedule", id: "LIST" }],
    }),
    updateSchedule: build.mutation<BackendSchedule, UpdateScheduleRequest>({
      query: ({ id, ...body }) => ({
        url: `schedules/${id}`,
        method: "PATCH",
        body,
      }),
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
