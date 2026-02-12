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

export interface BackendAuditEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly requestId: string | null;
  readonly action: string;
  readonly route: string | null;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly actorId: string | null;
  readonly actorType: string | null;
  readonly resourceId: string | null;
  readonly resourceType: string | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly metadataJson: string | null;
}

export interface BackendAuditListResponse {
  readonly items: readonly BackendAuditEvent[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface AuditListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly action?: string;
  readonly actorId?: string;
  readonly actorType?: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
  readonly status?: number;
  readonly requestId?: string;
}

export interface AuditExportQuery {
  readonly action?: string;
  readonly actorId?: string;
  readonly actorType?: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
  readonly status?: number;
  readonly requestId?: string;
}

/** Downloads audit CSV bytes from backend export route. */
export async function exportAuditEventsCsv(
  query: AuditExportQuery = {},
): Promise<Blob> {
  const baseUrl = getBaseUrl();
  const token = getToken();
  if (!token) {
    throw new Error("You are not authenticated.");
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  const url =
    queryString.length > 0
      ? `${baseUrl}/audit/events/export?${queryString}`
      : `${baseUrl}/audit/events/export`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Export failed with status ${response.status}`);
  }

  return await response.blob();
}

export const auditApi = createApi({
  reducerPath: "auditApi",
  baseQuery,
  tagTypes: ["AuditEvent"],
  endpoints: (build) => ({
    listAuditEvents: build.query<
      BackendAuditListResponse,
      AuditListQuery | void
    >({
      query: (query) => ({
        url: "audit/events",
        params: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 20,
          action: query?.action,
          actorId: query?.actorId,
          actorType: query?.actorType,
          resourceId: query?.resourceId,
          resourceType: query?.resourceType,
          status: query?.status,
          requestId: query?.requestId,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "AuditEvent" as const,
                id,
              })),
              { type: "AuditEvent", id: "LIST" },
            ]
          : [{ type: "AuditEvent", id: "LIST" }],
    }),
  }),
});

export const { useListAuditEventsQuery } = auditApi;
