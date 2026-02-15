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
    registerDevice: build.mutation<
      Device,
      {
        identifier: string;
        name: string;
        location?: string | null;
        apiKey: string;
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
        const body: { identifier: string; name: string; location?: string } = {
          identifier: arg.identifier,
          name: arg.name,
        };
        if (arg.location != null && arg.location !== "") {
          body.location = arg.location;
        }
        const response = await fetch(`${baseUrl}/devices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": arg.apiKey,
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
  useRegisterDeviceMutation,
} = devicesApi;
