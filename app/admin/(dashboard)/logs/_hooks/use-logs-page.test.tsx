import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useCan } from "@/hooks/use-can";
import {
  auditApi,
  useListAuditEventsQuery,
  type AuditListQuery,
  type BackendAuditEvent,
  type BackendAuditListResponse,
} from "@/lib/api/audit-api";
import { useGetDisplayOptionsQuery } from "@/lib/api/displays-api";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";

import { useAuditLogFilters } from "./use-audit-log-filters";
import { useLogsPage } from "./use-logs-page";

vi.mock("@/hooks/use-can", () => ({
  useCan: vi.fn(() => true),
}));

vi.mock("@/lib/api/audit-api", () => ({
  auditApi: {
    endpoints: {
      listAuditEvents: {
        useQueryState: vi.fn(() => ({
          data: undefined,
          isFetching: false,
        })),
      },
    },
  },
  useListAuditEventsQuery: vi.fn(() => ({
    data: undefined,
    isFetching: false,
  })),
}));

vi.mock("@/lib/api/displays-api", () => ({
  useGetDisplayOptionsQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(() => ({ data: [] })),
}));

vi.mock("./use-audit-log-filters", () => ({
  ACTOR_TYPE_FILTERS: ["all", "user", "display"],
  useAuditLogFilters: vi.fn(),
}));

vi.mock("./use-actor-resolver", () => ({
  useActorResolver: vi.fn(() => ({
    getActorName: vi.fn(() => "Admin"),
    getActorAvatarUrl: vi.fn(() => null),
  })),
}));

const useCanMock = vi.mocked(useCan);
const useListAuditEventsQueryMock = vi.mocked(useListAuditEventsQuery);
const useListAuditEventsQueryStateMock = vi.mocked(
  auditApi.endpoints.listAuditEvents.useQueryState,
);
const useGetDisplayOptionsQueryMock = vi.mocked(useGetDisplayOptionsQuery);
const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);
const useAuditLogFiltersMock = vi.mocked(useAuditLogFilters);

const initialQuery: AuditListQuery = {
  page: 1,
  pageSize: 20,
};

function makeAuditData(ids: readonly string[]): BackendAuditListResponse {
  return {
    items: ids.map(
      (id): BackendAuditEvent => ({
        id,
        occurredAt: "2026-05-08T00:00:00.000Z",
        requestId: null,
        action: "audit.event.list",
        route: null,
        method: "GET",
        path: "/audit/events",
        status: 200,
        actorId: "user-1",
        actorType: "user",
        resourceId: null,
        resourceType: null,
        ipAddress: null,
        userAgent: null,
        metadataJson: null,
      }),
    ),
    total: ids.length,
    page: 1,
    pageSize: 20,
  };
}

function mockFilters(query: AuditListQuery) {
  useAuditLogFiltersMock.mockReturnValue({
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    listQuery: query,
    exportQuery: query,
    fromDraft: "",
    toDraft: "",
    action: query.action ?? "",
    actorType: "all",
    resourceType: "",
    resourceTypeInput: "",
    statusRaw: query.status != null ? String(query.status) : "",
    requestId: query.requestId ?? "",
    setPage: vi.fn(),
    setFromDraft: vi.fn(),
    setToDraft: vi.fn(),
    setAction: vi.fn(),
    setActorType: vi.fn(),
    setResourceType: vi.fn(),
    setResourceTypeInput: vi.fn(),
    setStatusRaw: vi.fn(),
    setRequestId: vi.fn(),
    resetFilters: vi.fn(),
  } as unknown as ReturnType<typeof useAuditLogFilters>);
}

describe("useLogsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCanMock.mockReturnValue(true);
    mockFilters(initialQuery);
    useListAuditEventsQueryMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<typeof useListAuditEventsQuery>);
    useListAuditEventsQueryStateMock.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as unknown as ReturnType<
      typeof auditApi.endpoints.listAuditEvents.useQueryState
    >);
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);
    useGetDisplayOptionsQueryMock.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetDisplayOptionsQuery>);
  });

  test("uses initial audit data when returning to the initial query", () => {
    useListAuditEventsQueryMock.mockReturnValue({
      data: makeAuditData(["stale-event"]),
      isFetching: false,
    } as unknown as ReturnType<typeof useListAuditEventsQuery>);

    const { result } = renderHook(() =>
      useLogsPage({
        initialEvents: {
          queryArgs: initialQuery,
          data: makeAuditData(["initial-event"]),
        },
      }),
    );

    expect(useListAuditEventsQueryMock).toHaveBeenCalledWith(initialQuery, {
      refetchOnFocus: false,
      refetchOnReconnect: false,
      skip: true,
    });
    expect(result.current.logs.map((log) => log.id)).toEqual(["initial-event"]);
  });

  test("uses active audit query data for changed filters", () => {
    const filteredQuery: AuditListQuery = {
      page: 1,
      pageSize: 20,
      status: 500,
    };
    mockFilters(filteredQuery);
    useListAuditEventsQueryMock.mockReturnValue({
      data: makeAuditData(["filtered-event"]),
      isFetching: false,
    } as unknown as ReturnType<typeof useListAuditEventsQuery>);

    const { result } = renderHook(() =>
      useLogsPage({
        initialEvents: {
          queryArgs: initialQuery,
          data: makeAuditData(["initial-event"]),
        },
      }),
    );

    expect(result.current.logs.map((log) => log.id)).toEqual([
      "filtered-event",
    ]);
  });
});
