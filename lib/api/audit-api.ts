import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import { api } from "@/lib/api/api";
import { extractApiError } from "@/lib/api/contracts";
import { authFetch } from "@/lib/auth-session";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import { applyMutationCacheEffects } from "@/lib/api/cache-side-effects";

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
  readonly q?: string;
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
  readonly q?: string;
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

export type FlushAuditEventsRequest =
  | {
      readonly mode: "olderThanDays";
      readonly days: 7 | 30 | 90;
    }
  | {
      readonly mode: "beforeDate";
      readonly date: string;
    }
  | {
      readonly mode: "all";
    };

export interface FlushAuditEventsResponse {
  readonly deleted: number;
}

/** Downloads audit CSV bytes from backend export route. */
export async function exportAuditEventsCsv(
  query: AuditExportQuery = {},
): Promise<Blob> {
  const baseUrl = getBaseUrl();

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

  const response = await authFetch(url, {
    method: "GET",
    headers: getDevOnlyRequestHeaders(),
  });

  if (!response.ok) {
    const payload = await response
      .text()
      .then((text) => {
        try {
          return text ? JSON.parse(text) : undefined;
        } catch {
          return undefined;
        }
      })
      .catch(() => undefined);
    const message = extractApiError(payload)?.error.message;
    throw new Error(message ?? `Export failed with status ${response.status}`);
  }

  return await response.blob();
}

export const auditApi = api.injectEndpoints({
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
          q: query?.q,
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
      transformResponse: (response) =>
        transformPaginatedListResponse<BackendAuditEvent>(
          response,
          "listAuditEvents",
        ),
      providesTags: createProvidesTags("AuditEvent"),
    }),
    flushAuditEvents: build.mutation<
      FlushAuditEventsResponse,
      FlushAuditEventsRequest
    >({
      query: (body) => ({
        url: "audit/events",
        method: "DELETE",
        body,
      }),
      transformResponse: (response: { data?: FlushAuditEventsResponse }) => {
        if (
          response.data == null ||
          typeof response.data.deleted !== "number"
        ) {
          throw new Error("Invalid audit flush response");
        }
        return response.data;
      },
      invalidatesTags: [{ type: "AuditEvent", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [{ type: "AuditEvent", id: "LIST" }],
            revalidate: ["audit"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useListAuditEventsQuery,
  useLazyListAuditEventsQuery,
  useFlushAuditEventsMutation,
} = auditApi;
