import {
  revalidateWildfireTagViaRoute,
  revalidateWildfireTagsViaRoute,
} from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";

async function bumpSchedulesNextCache(): Promise<void> {
  try {
    await revalidateWildfireTagViaRoute("schedules-bootstrap");
  } catch {
    // best-effort
  }
}

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
  readonly createdBy: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByUser: {
    readonly id: string;
    readonly username: string;
    readonly name: string | null;
  } | null;
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

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function scheduleMatchesWindow(
  schedule: BackendSchedule,
  query: ScheduleWindowQuery,
): boolean {
  const from = dateOnly(query.from);
  const to = dateOnly(query.to);
  const scheduleStart = dateOnly(schedule.startDate);
  const scheduleEnd = dateOnly(schedule.endDate);
  if (scheduleEnd < from || scheduleStart > to) return false;
  if (
    query.displayIds &&
    query.displayIds.length > 0 &&
    !query.displayIds.includes(schedule.displayId)
  ) {
    return false;
  }
  return true;
}

function upsertScheduleIntoWindow(
  schedules: BackendSchedule[],
  schedule: BackendSchedule,
  query: ScheduleWindowQuery,
): void {
  const index = schedules.findIndex((item) => item.id === schedule.id);
  const matches = scheduleMatchesWindow(schedule, query);
  if (index === -1) {
    if (matches) schedules.push(schedule);
    return;
  }
  if (matches) {
    schedules[index] = schedule;
  } else {
    schedules.splice(index, 1);
  }
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
      keepUnusedDataFor: 600,
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
      invalidatesTags: (result) =>
        result
          ? [
              { type: "Schedule", id: "LIST" },
              { type: "Schedule", id: result.id },
              { type: "Display", id: "LIST" },
            ]
          : [
              { type: "Schedule", id: "LIST" },
              { type: "Display", id: "LIST" },
            ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: created } = await queryFulfilled;
          const bootstrapArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "getSchedulesBootstrap",
          );
          for (const query of bootstrapArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "getSchedulesBootstrap",
                query,
                (draft) => {
                  upsertScheduleIntoWindow(
                    draft.schedules as BackendSchedule[],
                    created,
                    query,
                  );
                },
              ),
            );
          }
          const listArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "listSchedules",
          );
          for (const query of listArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "listSchedules",
                query,
                (draft) => {
                  upsertScheduleIntoWindow(
                    draft as BackendSchedule[],
                    created,
                    query,
                  );
                },
              ),
            );
          }
          await bumpSchedulesNextCache();
          dispatch(api.util.invalidateTags([{ type: "Display", id: "LIST" }]));
          void revalidateWildfireTagsViaRoute([
            "displays-bootstrap",
            "displays-options",
          ]);
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
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: "Schedule", id },
              { type: "Schedule", id: result.id },
              { type: "Schedule", id: "LIST" },
              { type: "Display", id: "LIST" },
            ]
          : [
              { type: "Schedule", id },
              { type: "Schedule", id: "LIST" },
            ],
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        try {
          const { data: updated } = await queryFulfilled;
          const bootstrapArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "getSchedulesBootstrap",
          );
          for (const query of bootstrapArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "getSchedulesBootstrap",
                query,
                (draft) => {
                  upsertScheduleIntoWindow(
                    draft.schedules as BackendSchedule[],
                    updated,
                    query,
                  );
                },
              ),
            );
          }
          const listArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "listSchedules",
          );
          for (const query of listArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "listSchedules",
                query,
                (draft) => {
                  upsertScheduleIntoWindow(
                    draft as BackendSchedule[],
                    updated,
                    query,
                  );
                },
              ),
            );
          }
          dispatch(
            schedulesApi.util.updateQueryData(
              "getSchedule",
              arg.id,
              () => updated,
            ),
          );
          await bumpSchedulesNextCache();
          dispatch(api.util.invalidateTags([{ type: "Display", id: "LIST" }]));
          void revalidateWildfireTagsViaRoute([
            "displays-bootstrap",
            "displays-options",
          ]);
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
      invalidatesTags: (_result, _error, id) => [
        { type: "Schedule", id },
        { type: "Schedule", id: "LIST" },
        { type: "Display", id: "LIST" },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          const removeSchedule = (schedules: BackendSchedule[]) => {
            const idx = schedules.findIndex((s) => s.id === id);
            if (idx !== -1) {
              schedules.splice(idx, 1);
            }
          };
          const bootstrapArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "getSchedulesBootstrap",
          );
          for (const query of bootstrapArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "getSchedulesBootstrap",
                query,
                (draft) => removeSchedule(draft.schedules as BackendSchedule[]),
              ),
            );
          }
          const listArgs = schedulesApi.util.selectCachedArgsForQuery(
            getState(),
            "listSchedules",
          );
          for (const query of listArgs) {
            dispatch(
              schedulesApi.util.updateQueryData(
                "listSchedules",
                query,
                (draft) => removeSchedule(draft as BackendSchedule[]),
              ),
            );
          }
          await bumpSchedulesNextCache();
          dispatch(api.util.invalidateTags([{ type: "Display", id: "LIST" }]));
          void revalidateWildfireTagsViaRoute([
            "displays-bootstrap",
            "displays-options",
          ]);
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
