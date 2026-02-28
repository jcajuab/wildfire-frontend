import { createApi } from "@reduxjs/toolkit/query/react";
import {
  baseQuery,
  getBaseUrl,
  getDevOnlyRequestHeaders,
} from "@/lib/api/base-query";
import {
  extractApiError,
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
  parseApiListResponse,
} from "@/lib/api/contracts";

/** Backend display shape (matches GET /displays and GET /displays/:id). */
export interface Display {
  readonly id: string;
  readonly identifier: string;
  readonly deviceFingerprint?: string | null;
  readonly name: string;
  readonly location: string | null;
  readonly ipAddress: string | null;
  readonly macAddress: string | null;
  readonly screenWidth: number | null;
  readonly screenHeight: number | null;
  readonly outputType: string | null;
  readonly orientation: "LANDSCAPE" | "PORTRAIT" | null;
  readonly lastSeenAt: string | null;
  readonly onlineStatus: "READY" | "LIVE" | "DOWN";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisplaysListResponse {
  readonly items: readonly Display[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface UpdateDisplayRequest {
  readonly id: string;
  readonly name?: string;
  readonly location?: string | null;
  readonly ipAddress?: string | null;
  readonly macAddress?: string | null;
  readonly screenWidth?: number | null;
  readonly screenHeight?: number | null;
  readonly outputType?: string | null;
  readonly orientation?: "LANDSCAPE" | "PORTRAIT" | null;
}

export interface DisplayGroup {
  readonly id: string;
  readonly name: string;
  /** Optional: backend may not send; use 0 for badge styling when missing. */
  readonly colorIndex?: number;
  readonly deviceIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DisplayGroupsListResponse {
  readonly items: readonly DisplayGroup[];
}

export interface DevicePairingCodeResponse {
  readonly code: string;
  readonly expiresAt: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const buildResponseParseError = (scope: string, error: unknown) => ({
  code: "INVALID_API_RESPONSE",
  message:
    error instanceof Error
      ? error.message
      : "Response payload does not match API contract.",
});

export const devicesApi = createApi({
  reducerPath: "devicesApi",
  baseQuery,
  tagTypes: ["Display", "DisplayGroup"],
  endpoints: (build) => ({
    getDevices: build.query<DisplaysListResponse, void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        const pageSize = PAGE_SIZE;
        let page = 1;
        let total = 0;
        const allItems: Display[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: {
                status: 500,
                data: "Failed to load displays: pagination limit reached.",
              },
            };
          }
          const result = await baseQueryFn({
            url: "displays",
            params: { page, pageSize },
          });
          if (result.error) {
            return { error: result.error };
          }

          let response: ReturnType<typeof parseApiListResponse<Display>>;
          try {
            response = parseApiListResponseSafe<Display>(
              result.data,
              "getDevices",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getDevices", error),
              },
            };
          }
          const pageData = response.data;
          total = response.meta.total;
          allItems.push(...pageData);

          if (allItems.length >= total || pageData.length === 0) {
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
                type: "Display" as const,
                id,
              })),
              { type: "Display", id: "LIST" },
            ]
          : [{ type: "Display", id: "LIST" }],
    }),
    getDevice: build.query<Display, string>({
      query: (id) => `displays/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<Display>(response, "getDevice"),
      providesTags: (_result, _error, id) => [{ type: "Display", id }],
    }),
    updateDevice: build.mutation<Display, UpdateDisplayRequest>({
      query: ({ id, ...body }) => ({
        url: `displays/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<Display>(response, "updateDevice"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id },
      ],
    }),
    getDeviceGroups: build.query<DisplayGroupsListResponse, void>({
      query: () => "displays/groups",
      transformResponse: (response) =>
        ({
          items: parseApiResponseDataSafe<readonly DisplayGroup[]>(
            response,
            "getDeviceGroups",
          ),
        }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "DisplayGroup" as const,
                id,
              })),
              { type: "DisplayGroup", id: "LIST" },
            ]
          : [{ type: "DisplayGroup", id: "LIST" }],
    }),
    createDeviceGroup: build.mutation<
      DisplayGroup,
      { name: string; colorIndex?: number }
    >({
      query: (body) => ({
        url: "displays/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "createDeviceGroup"),
      invalidatesTags: [{ type: "DisplayGroup", id: "LIST" }],
    }),
    updateDeviceGroup: build.mutation<
      DisplayGroup,
      { groupId: string; name: string; colorIndex?: number }
    >({
      query: ({ groupId, name, colorIndex }) => ({
        url: `displays/groups/${groupId}`,
        method: "PATCH",
        body: { name, colorIndex },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DisplayGroup>(response, "updateDeviceGroup"),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DisplayGroup", id: "LIST" },
        { type: "DisplayGroup", id: groupId },
        { type: "Display", id: "LIST" },
      ],
    }),
    deleteDeviceGroup: build.mutation<void, { groupId: string }>({
      query: ({ groupId }) => ({
        url: `displays/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DisplayGroup", id: "LIST" },
        { type: "DisplayGroup", id: groupId },
        { type: "Display", id: "LIST" },
      ],
    }),
    setDeviceGroups: build.mutation<
      void,
      { displayId: string; groupIds: string[] }
    >({
      query: ({ displayId, groupIds }) => ({
        url: `displays/${displayId}/groups`,
        method: "PUT",
        body: { groupIds },
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
        { type: "DisplayGroup", id: "LIST" },
      ],
    }),
    requestDeviceRefresh: build.mutation<void, { displayId: string }>({
      query: ({ displayId }) => ({
        url: `displays/${displayId}/refresh`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { displayId }) => [
        { type: "Display", id: "LIST" },
        { type: "Display", id: displayId },
      ],
    }),
    createPairingCode: build.mutation<DevicePairingCodeResponse, void>({
      query: () => ({
        url: "displays/pairing-codes",
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<DevicePairingCodeResponse>(
          response,
          "createPairingCode",
        ),
    }),
    registerDevice: build.mutation<
      Display,
      {
        pairingCode: string;
        identifier: string;
        deviceFingerprint?: string | null;
        name: string;
        location?: string | null;
        screenWidth: number;
        screenHeight: number;
      }
    >({
      queryFn: async (arg) => {
        const baseUrl = getBaseUrl();
        if (!baseUrl) {
          return {
            error: {
              status: 0,
              data: "API URL not configured (NEXT_PUBLIC_API_URL).",
            },
          };
        }
        const body: {
          pairingCode: string;
          identifier: string;
          deviceFingerprint?: string;
          name: string;
          location?: string;
          screenWidth: number;
          screenHeight: number;
        } = {
          pairingCode: arg.pairingCode,
          identifier: arg.identifier,
          name: arg.name,
          screenWidth: arg.screenWidth,
          screenHeight: arg.screenHeight,
        };
        if (arg.deviceFingerprint != null && arg.deviceFingerprint !== "") {
          body.deviceFingerprint = arg.deviceFingerprint;
        }
        if (arg.location != null && arg.location !== "") {
          body.location = arg.location;
        }
        const response = await fetch(`${baseUrl}/displays`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getDevOnlyRequestHeaders(),
          },
          body: JSON.stringify(body),
        });
        let data: unknown;
        try {
          data = await response.json();
        } catch {
          data = undefined;
        }

        if (response.ok) {
          try {
            return {
              data: parseApiResponseDataSafe<Display>(data, "registerDevice"),
            };
          } catch {
            return {
              error: {
                status: 500,
                data: "Invalid register display response format.",
              },
            };
          }
        }

        const parsedError = extractApiError(data);
        const message =
          parsedError?.error.message ?? "Failed to register display.";
        const normalizedError = parsedError ?? {
          error: {
            code: "register_display_error",
            message,
          },
        };

        return {
          error: {
            status: response.status,
            data: normalizedError,
          },
        };
      },
      invalidatesTags: [{ type: "Display", id: "LIST" }],
    }),
  }),
});

export const {
  useGetDevicesQuery,
  useGetDeviceQuery,
  useLazyGetDeviceQuery,
  useUpdateDeviceMutation,
  useGetDeviceGroupsQuery,
  useCreateDeviceGroupMutation,
  useUpdateDeviceGroupMutation,
  useDeleteDeviceGroupMutation,
  useSetDeviceGroupsMutation,
  useRequestDeviceRefreshMutation,
  useCreatePairingCodeMutation,
  useRegisterDeviceMutation,
} = devicesApi;
