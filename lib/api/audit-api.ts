import { createApi } from "@reduxjs/toolkit/query/react";
import {
  baseQuery,
  getBaseUrl,
  getDevOnlyRequestHeaders,
  getToken,
} from "@/lib/api/base-query";

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
  readonly actorName?: string | null;
  readonly actorEmail?: string | null;
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
  readonly from?: string;
  readonly to?: string;
  readonly action?: string;
  readonly actorId?: string;
  readonly actorType?: string;
  readonly resourceId?: string;
  readonly resourceType?: string;
  readonly status?: number;
  readonly requestId?: string;
}

export interface AuditExportQuery {
  readonly from?: string;
  readonly to?: string;
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
      ...getDevOnlyRequestHeaders(),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    let message: string | undefined;
    try {
      const parsed = JSON.parse(text) as {
        error?: {
          message?: unknown;
        };
      };
      if (typeof parsed?.error?.message === "string") {
        message = parsed.error.message;
      }
    } catch {
      message = undefined;
    }
    throw new Error(
      (message ?? text) || `Export failed with status ${response.status}`,
    );
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
          from: query?.from,
          to: query?.to,
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
