import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

/** Backend device shape (matches GET /devices and GET /devices/:id). */
export interface Device {
  readonly id: string;
  readonly identifier: string;
  readonly name: string;
  readonly location: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DevicesListResponse {
  readonly items: readonly Device[];
}

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

export const devicesApi = createApi({
  reducerPath: "devicesApi",
  baseQuery,
  tagTypes: ["Device"],
  endpoints: (build) => ({
    getDevices: build.query<DevicesListResponse, void>({
      query: () => "devices",
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
      query: (id) => `devices/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Device", id }],
    }),
  }),
});

export const { useGetDevicesQuery, useGetDeviceQuery, useLazyGetDeviceQuery } =
  devicesApi;
