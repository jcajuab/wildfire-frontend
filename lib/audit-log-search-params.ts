import type { AuditListQuery } from "@/lib/api/audit-api";
import {
  dateToISOEnd,
  dateToISOStart,
  isValidYyyyMmDd,
} from "@/lib/formatters";
import { ADMIN_LOG_PAGE_SIZE } from "@/lib/admin-pagination";
import type { ResourceTypeFilter } from "@/lib/audit-resource-types";
import { RESOURCE_TYPE_FILTER_OPTIONS } from "@/lib/audit-resource-types";

export const LOGS_PAGE_SIZE = ADMIN_LOG_PAGE_SIZE;

const ACTOR_TYPES = ["all", "user", "display"] as const;
type ActorTypeParam = (typeof ACTOR_TYPES)[number];

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseActorType(raw: string | undefined): ActorTypeParam {
  if (
    raw != null &&
    raw !== "all" &&
    ACTOR_TYPES.includes(raw as ActorTypeParam)
  ) {
    return raw as ActorTypeParam;
  }
  return "all";
}

function parseResourceType(raw: string | undefined): ResourceTypeFilter {
  if (
    raw != null &&
    raw !== "" &&
    RESOURCE_TYPE_FILTER_OPTIONS.includes(raw as ResourceTypeFilter)
  ) {
    return raw as ResourceTypeFilter;
  }
  return "";
}

function parseStatus(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 100 || parsed > 599) {
    return undefined;
  }
  return parsed;
}

/**
 * Build audit list query from Next.js `searchParams` (same keys as nuqs on Logs page).
 */
export function auditListQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): AuditListQuery {
  const pageRaw = firstParam(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  const from = firstParam(searchParams.from)?.trim() ?? "";
  const to = firstParam(searchParams.to)?.trim() ?? "";
  const q = firstParam(searchParams.q)?.trim() ?? "";
  const action = firstParam(searchParams.action)?.trim() ?? "";
  const requestId = firstParam(searchParams.requestId)?.trim() ?? "";
  const resourceType = parseResourceType(
    firstParam(searchParams.resourceType)?.trim(),
  );
  const status = parseStatus(firstParam(searchParams.status)?.trim());
  const actorType = parseActorType(firstParam(searchParams.actorType)?.trim());

  return {
    page,
    pageSize: LOGS_PAGE_SIZE,
    q: q || undefined,
    from:
      from !== "" && isValidYyyyMmDd(from) ? dateToISOStart(from) : undefined,
    to: to !== "" && isValidYyyyMmDd(to) ? dateToISOEnd(to) : undefined,
    action: action || undefined,
    actorType:
      actorType === "all"
        ? undefined
        : (actorType as Exclude<ActorTypeParam, "all">),
    resourceType: resourceType || undefined,
    status,
    requestId: requestId || undefined,
  };
}
