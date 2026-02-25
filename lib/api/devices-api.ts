import { createApi } from "@reduxjs/toolkit/query/react";
import {
  baseQuery,
  getBaseUrl,
  getDevOnlyRequestHeaders,
} from "@/lib/api/base-query";

/** Backend device shape (matches GET /displays and GET /displays/:id). */
export interface Device {
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

export interface DevicesListResponse {
  readonly items: readonly Device[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface UpdateDeviceRequest {
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

export interface DeviceGroup {
  readonly id: string;
  readonly name: string;
  /** Optional: backend may not send; use 0 for badge styling when missing. */
  readonly colorIndex?: number;
  readonly deviceIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeviceGroupsListResponse {
  readonly items: readonly DeviceGroup[];
}

export interface DevicePairingCodeResponse {
  readonly code: string;
  readonly expiresAt: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

export const devicesApi = createApi({
  reducerPath: "devicesApi",
  baseQuery,
  tagTypes: ["Device", "DeviceGroup"],
  endpoints: (build) => ({
    getDevices: build.query<DevicesListResponse, void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        const pageSize = PAGE_SIZE;
        let page = 1;
        let total = 0;
        const allItems: Device[] = [];

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

          const data = result.data as DevicesListResponse;
          total = data.total;
          allItems.push(...data.items);

          if (allItems.length >= total || data.items.length === 0) {
            break;
          }
          page += 1;
        }

        return {
          data: {
            items: allItems,
            total: allItems.length,
            page: 1,
            pageSize: allItems.length === 0 ? PAGE_SIZE : allItems.length,
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Device" as const,
                id,
              })),
              { type: "Device", id: "LIST" },
            ]
          : [{ type: "Device", id: "LIST" }],
    }),
    getDevice: build.query<Device, string>({
      query: (id) => `displays/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Device", id }],
    }),
    updateDevice: build.mutation<Device, UpdateDeviceRequest>({
      query: ({ id, ...body }) => ({
        url: `displays/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Device", id: "LIST" },
        { type: "Device", id },
      ],
    }),
    getDeviceGroups: build.query<DeviceGroupsListResponse, void>({
      query: () => "displays/groups",
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "DeviceGroup" as const,
                id,
              })),
              { type: "DeviceGroup", id: "LIST" },
            ]
          : [{ type: "DeviceGroup", id: "LIST" }],
    }),
    createDeviceGroup: build.mutation<
      DeviceGroup,
      { name: string; colorIndex?: number }
    >({
      query: (body) => ({
        url: "displays/groups",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "DeviceGroup", id: "LIST" }],
    }),
    updateDeviceGroup: build.mutation<
      DeviceGroup,
      { groupId: string; name: string; colorIndex?: number }
    >({
      query: ({ groupId, name, colorIndex }) => ({
        url: `displays/groups/${groupId}`,
        method: "PATCH",
        body: { name, colorIndex },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DeviceGroup", id: "LIST" },
        { type: "DeviceGroup", id: groupId },
        { type: "Device", id: "LIST" },
      ],
    }),
    deleteDeviceGroup: build.mutation<void, { groupId: string }>({
      query: ({ groupId }) => ({
        url: `displays/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "DeviceGroup", id: "LIST" },
        { type: "DeviceGroup", id: groupId },
        { type: "Device", id: "LIST" },
      ],
    }),
    setDeviceGroups: build.mutation<
      void,
      { deviceId: string; groupIds: string[] }
    >({
      query: ({ deviceId, groupIds }) => ({
        url: `displays/${deviceId}/groups`,
        method: "PUT",
        body: { groupIds },
      }),
      invalidatesTags: (_result, _error, { deviceId }) => [
        { type: "Device", id: "LIST" },
        { type: "Device", id: deviceId },
        { type: "DeviceGroup", id: "LIST" },
      ],
    }),
    requestDeviceRefresh: build.mutation<void, { deviceId: string }>({
      query: ({ deviceId }) => ({
        url: `displays/${deviceId}/refresh`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { deviceId }) => [
        { type: "Device", id: "LIST" },
        { type: "Device", id: deviceId },
      ],
    }),
    createPairingCode: build.mutation<DevicePairingCodeResponse, void>({
      query: () => ({
        url: "displays/pairing-codes",
        method: "POST",
      }),
    }),
    registerDevice: build.mutation<
      Device,
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
        const raw = await response.text();
        let data: unknown;
        try {
          data = raw ? JSON.parse(raw) : undefined;
        } catch {
          data = undefined;
        }
        if (response.ok) {
          return { data: data as Device };
        }
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: { message?: unknown } }).error?.message ===
            "string"
            ? (data as { error: { message: string } }).error.message
            : "Failed to register display.";
        return {
          error: {
            status: response.status,
            data: message as unknown,
          },
        };
      },
      invalidatesTags: [{ type: "Device", id: "LIST" }],
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
