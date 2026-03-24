"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  dateToISOEnd,
  dateToISOStart,
  isValidYyyyMmDd,
} from "@/lib/formatters";

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

  const setPage = useCallback(
    (value: number) => setFilters({ page: value }),
    [setFilters],
  );
  const setFrom = useCallback(
    (value: string) => setFilters({ from: value }),
    [setFilters],
  );
  const setTo = useCallback(
    (value: string) => setFilters({ to: value }),
    [setFilters],
  );
  const setAction = useCallback(
    (value: string) => setFilters({ action: value }),
    [setFilters],
  );
  const setRequestId = useCallback(
    (value: string) => setFilters({ requestId: value }),
    [setFilters],
  );
  const setResourceType = useCallback(
    (value: ResourceTypeFilter) => setFilters({ resourceType: value }),
    [setFilters],
  );
  const setStatusRaw = useCallback(
    (value: string) => setFilters({ status: value }),
    [setFilters],
  );
  const setActorType = useCallback(
    (value: ActorTypeFilter) => setFilters({ actorType: value }),
    [setFilters],
  );

  const [fromDraft, setFromDraft] = useState(from);
  const [toDraft, setToDraft] = useState(to);
  const debouncedFromDraft = useDebounce(fromDraft, 250);
  const debouncedToDraft = useDebounce(toDraft, 250);
  const debouncedAction = useDebounce(action, 500);
  const debouncedRequestId = useDebounce(requestId, 500);

  const [resourceTypeInput, setResourceTypeInput] = useState<string>(() =>
    resourceType === "" ? "" : getResourceTypeFilterLabel(resourceType),
  );

  useEffect(() => {
    setFromDraft(from);
  }, [from]);

  useEffect(() => {
    setToDraft(to);
  }, [to]);

  useEffect(() => {
    const normalized = from.trim();
    if (normalized !== from) {
      setFrom(normalized);
      return;
    }
    if (normalized !== "" && !isValidYyyyMmDd(normalized)) {
      setFrom("");
    }
  }, [from, setFrom]);

  useEffect(() => {
    const normalized = to.trim();
    if (normalized !== to) {
      setTo(normalized);
      return;
    }
    if (normalized !== "" && !isValidYyyyMmDd(normalized)) {
      setTo("");
    }
  }, [setTo, to]);

  useEffect(() => {
    if (debouncedFromDraft === from) {
      return;
    }
    const nextFrom = debouncedFromDraft.trim();
    if (nextFrom !== "" && !isValidYyyyMmDd(nextFrom)) {
      return;
    }
    setFrom(nextFrom);
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedFromDraft, from, page, setFrom, setPage]);

  useEffect(() => {
    if (debouncedToDraft === to) {
      return;
    }
    const nextTo = debouncedToDraft.trim();
    if (nextTo !== "" && !isValidYyyyMmDd(nextTo)) {
      return;
    }
    setTo(nextTo);
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedToDraft, page, setPage, setTo, to]);

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
      from: from && isValidYyyyMmDd(from) ? dateToISOStart(from) : undefined,
      to: to && isValidYyyyMmDd(to) ? dateToISOEnd(to) : undefined,
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
    fromDraft,
    setFromDraft,
    to,
    setTo,
    toDraft,
    setToDraft,
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
