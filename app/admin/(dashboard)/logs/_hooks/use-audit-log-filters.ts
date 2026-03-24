"use client";

import { useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import {
  debounce,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import type { AuditListQuery } from "@/lib/api/audit-api";
import {
  getResourceTypeFilterLabel,
  getResourceTypeValueFromInput,
  type ResourceTypeFilter,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
} from "@/lib/audit-resource-types";
import { dateToISOEnd, dateToISOStart } from "@/lib/formatters";

export const ACTOR_TYPE_FILTERS = ["all", "user", "display"] as const;
export type ActorTypeFilter = (typeof ACTOR_TYPE_FILTERS)[number];

const auditLogFiltersParsers = {
  page: parseAsInteger.withDefault(1),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  action: parseAsString
    .withDefault("")
    .withOptions({ limitUrlUpdates: debounce(500) }),
  requestId: parseAsString
    .withDefault("")
    .withOptions({ limitUrlUpdates: debounce(500) }),
  resourceType: parseAsStringLiteral(RESOURCE_TYPE_FILTER_OPTIONS).withDefault(
    "",
  ),
  status: parseAsString.withDefault(""),
  actorType: parseAsStringLiteral(ACTOR_TYPE_FILTERS).withDefault("all"),
};

export function useAuditLogFilters(pageSize: number) {
  const [filters, setFilters] = useQueryStates(auditLogFiltersParsers);

  const {
    page,
    from,
    to,
    action,
    requestId,
    resourceType,
    status: statusRaw,
    actorType,
  } = filters;

  const debouncedAction = useDebounce(action, 500);
  const debouncedRequestId = useDebounce(requestId, 500);

  const [resourceTypeInput, setResourceTypeInput] = useState<string>(() =>
    resourceType === "" ? "" : getResourceTypeFilterLabel(resourceType),
  );

  const setPage = (value: number) => setFilters({ page: value });
  const setFrom = (value: string) => setFilters({ from: value });
  const setTo = (value: string) => setFilters({ to: value });
  const setAction = (value: string) => setFilters({ action: value });
  const setRequestId = (value: string) => setFilters({ requestId: value });
  const setResourceType = (value: ResourceTypeFilter) =>
    setFilters({ resourceType: value });
  const setStatusRaw = (value: string) => setFilters({ status: value });
  const setActorType = (value: ActorTypeFilter) =>
    setFilters({ actorType: value });

  const parsedStatus = useMemo<number | undefined>(() => {
    const parsed = Number.parseInt(statusRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 100 || parsed > 599) {
      return undefined;
    }
    return parsed;
  }, [statusRaw]);

  const listQuery = useMemo<AuditListQuery>(
    () => ({
      page,
      pageSize,
      from: from ? dateToISOStart(from) : undefined,
      to: to ? dateToISOEnd(to) : undefined,
      action: debouncedAction || undefined,
      actorType: actorType === "all" ? undefined : actorType,
      resourceType: resourceType || undefined,
      status: parsedStatus,
      requestId: debouncedRequestId || undefined,
    }),
    [
      debouncedAction,
      actorType,
      from,
      page,
      pageSize,
      parsedStatus,
      debouncedRequestId,
      resourceType,
      to,
    ],
  );

  const selectedResourceTypeValue = useMemo<string | null>(() => {
    if (resourceTypeInput === "") return RESOURCE_TYPE_SELECT_ALL_VALUE;
    const resolvedValue = getResourceTypeValueFromInput(resourceTypeInput);
    if (resolvedValue !== null && resolvedValue !== "") {
      return resolvedValue;
    }
    return resourceType || RESOURCE_TYPE_SELECT_ALL_VALUE;
  }, [resourceTypeInput, resourceType]);

  return {
    page,
    setPage,
    from,
    setFrom,
    to,
    setTo,
    action,
    setAction,
    requestId,
    setRequestId,
    resourceType,
    setResourceType,
    resourceTypeInput,
    setResourceTypeInput,
    statusRaw,
    setStatusRaw,
    actorType,
    setActorType,
    parsedStatus,
    listQuery,
    selectedResourceTypeValue,
  };
}
