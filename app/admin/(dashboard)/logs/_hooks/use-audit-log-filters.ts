"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import {
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
  q: parseAsString.withDefault(""),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
  author: parseAsString.withDefault(""),
  action: parseAsString.withDefault(""),
  requestId: parseAsString.withDefault(""),
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
    q,
    from,
    to,
    author,
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
  const setSearch = useCallback(
    (value: string) => setFilters({ q: value }),
    [setFilters],
  );
  const setTo = useCallback(
    (value: string) => setFilters({ to: value }),
    [setFilters],
  );
  const setAuthor = useCallback(
    (value: string) => setFilters({ author: value }),
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
  const isResettingRef = useRef(false);
  const debouncedFromDraft = useDebounce(fromDraft, 250);
  const debouncedToDraft = useDebounce(toDraft, 250);
  const debouncedSearch = useDebounce(q, 500);
  const debouncedAuthor = useDebounce(author, 500);

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
    if (isResettingRef.current) {
      return;
    }
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
    if (isResettingRef.current) {
      return;
    }
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
      q: debouncedSearch || undefined,
      from: from && isValidYyyyMmDd(from) ? dateToISOStart(from) : undefined,
      to: to && isValidYyyyMmDd(to) ? dateToISOEnd(to) : undefined,
      author: debouncedAuthor || undefined,
      resourceType: resourceType || undefined,
      status: parsedStatus,
    }),
    [
      debouncedSearch,
      debouncedAuthor,
      from,
      page,
      pageSize,
      parsedStatus,
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

  const resetAll = useCallback(() => {
    isResettingRef.current = true;
    setFromDraft("");
    setToDraft("");
    setResourceTypeInput("");
    void setFilters({
      page: null,
      q: null,
      from: null,
      to: null,
      author: null,
      action: null,
      requestId: null,
      resourceType: null,
      status: null,
      actorType: null,
    });
    // Allow debounce effects to settle before re-enabling sync
    setTimeout(() => {
      isResettingRef.current = false;
    }, 500);
  }, [setFilters]);

  return {
    page,
    setPage,
    search: q,
    setSearch,
    from,
    setFrom,
    fromDraft,
    setFromDraft,
    to,
    setTo,
    toDraft,
    setToDraft,
    author,
    setAuthor,
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
    resetAll,
  };
}
