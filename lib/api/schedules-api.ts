import { api } from "@/lib/api/api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";

export interface BackendSchedule {
  readonly id: string;
  readonly name: string;
  readonly kind: "PLAYLIST" | "FLASH";
  readonly playlistId: string | null;
  readonly contentId: string | null;
  readonly displayId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly playlist: {
    readonly id: string;
    readonly name: string | null;
  } | null;
  readonly content: {
    readonly id: string;
    readonly title: string | null;
    readonly type: "FLASH";
    readonly flashMessage: string | null;
    readonly flashTone: "INFO" | "WARNING" | "CRITICAL" | null;
  } | null;
  readonly display: {
    readonly id: string;
    readonly name: string | null;
  };
}

export interface ScheduleWindowQuery {
  readonly from: string;
  readonly to: string;
  readonly displayIds?: readonly string[];
}

export interface CreateScheduleRequest {
  readonly name: string;
  readonly kind: "PLAYLIST" | "FLASH";
  readonly playlistId: string | null;
  readonly contentId: string | null;
  readonly displayId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface UpdateScheduleRequest {
  readonly id: string;
  readonly name?: string;
  readonly kind?: "PLAYLIST" | "FLASH";
  readonly playlistId?: string | null;
  readonly contentId?: string | null;
  readonly displayId?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly startTime?: string;
  readonly endTime?: string;
}

export interface SchedulesBootstrapResponse {
  readonly schedules: readonly BackendSchedule[];
  readonly displayOptions: readonly { id: string; name: string }[];
  readonly displayGroups: readonly {
    id: string;
    name: string;
    displayIds: readonly string[];
    createdAt: string;
    updatedAt: string;
  }[];
  readonly playlistOptions: readonly { id: string; name: string }[];
  readonly flashContentOptions: readonly {
    id: string;
    title: string;
    type: "FLASH";
  }[];
}

export const schedulesApi = api.injectEndpoints({
  endpoints: (build) => ({
    listSchedules: build.query<readonly BackendSchedule[], ScheduleWindowQuery>(
      {
        query: (query) => ({
          url: "schedules/window",
          params: {
            from: query.from,
            to: query.to,
            displayIds: query.displayIds,
          },
        }),
        transformResponse: (response) =>
          parseApiResponseDataSafe<BackendSchedule[]>(
            response,
            "listSchedules",
          ),
        providesTags: (result) =>
          result
            ? [
                ...result.map(({ id }) => ({
                  type: "Schedule" as const,
                  id,
                })),
                { type: "Schedule", id: "LIST" },
              ]
            : [{ type: "Schedule", id: "LIST" }],
      },
    ),
    getSchedulesBootstrap: build.query<
      SchedulesBootstrapResponse,
      ScheduleWindowQuery
    >({
      query: (query) => ({
        url: "schedules/bootstrap",
        params: {
          from: query.from,
          to: query.to,
          displayIds: query.displayIds,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<SchedulesBootstrapResponse>(
          response,
          "getSchedulesBootstrap",
        ),
      providesTags: [{ type: "Schedule", id: "LIST" }],
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: created } = await queryFulfilled;
          // Patch all cached getSchedulesBootstrap queries
          const entries = schedulesApi.util.selectInvalidatedBy(getState(), [
            { type: "Schedule", id: "LIST" },
          ]);
          for (const entry of entries) {
            if (entry.endpointName === "getSchedulesBootstrap") {
              dispatch(
                schedulesApi.util.updateQueryData(
                  "getSchedulesBootstrap",
                  entry.originalArgs as ScheduleWindowQuery,
                  (draft) => {
                    (draft.schedules as BackendSchedule[]).push(created);
                  },
                ),
              );
            }
          }
        } catch {
          // mutation failed
        }
      },
    }),
    updateSchedule: build.mutation<BackendSchedule, UpdateScheduleRequest>({
      query: ({ id, ...body }) => ({
        url: `schedules/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<BackendSchedule>(response, "updateSchedule"),
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: updated } = await queryFulfilled;
          const entries = schedulesApi.util.selectInvalidatedBy(getState(), [
            { type: "Schedule", id: "LIST" },
          ]);
          for (const entry of entries) {
            if (entry.endpointName === "getSchedulesBootstrap") {
              dispatch(
                schedulesApi.util.updateQueryData(
                  "getSchedulesBootstrap",
                  entry.originalArgs as ScheduleWindowQuery,
                  (draft) => {
                    const schedules = draft.schedules as BackendSchedule[];
                    const idx = schedules.findIndex((s) => s.id === arg.id);
                    if (idx !== -1) {
                      schedules[idx] = updated;
                    }
                  },
                ),
              );
            }
          }
        } catch {
          // mutation failed
        }
      },
    }),
    deleteSchedule: build.mutation<void, string>({
      query: (id) => ({
        url: `schedules/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          const entries = schedulesApi.util.selectInvalidatedBy(getState(), [
            { type: "Schedule", id: "LIST" },
          ]);
          for (const entry of entries) {
            if (entry.endpointName === "getSchedulesBootstrap") {
              dispatch(
                schedulesApi.util.updateQueryData(
                  "getSchedulesBootstrap",
                  entry.originalArgs as ScheduleWindowQuery,
                  (draft) => {
                    const schedules = draft.schedules as BackendSchedule[];
                    const idx = schedules.findIndex((s) => s.id === id);
                    if (idx !== -1) {
                      schedules.splice(idx, 1);
                    }
                  },
                ),
              );
            }
          }
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useListSchedulesQuery,
  useGetSchedulesBootstrapQuery,
  useGetScheduleQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
} = schedulesApi;
