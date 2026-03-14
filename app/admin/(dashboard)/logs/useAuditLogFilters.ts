import { useEffect, useMemo, useState } from "react";
import {
  useQueryEnumState,
  useQueryNumberState,
  useQueryStringState,
} from "@/hooks/use-query-state";
import type { AuditListQuery } from "@/lib/api/audit-api";
import {
  getResourceTypeValueFromInput,
  getResourceTypeLabel,
  type ResourceTypeFilter,
  RESOURCE_TYPE_FILTER_OPTIONS,
  RESOURCE_TYPE_SELECT_ALL_VALUE,
} from "@/lib/audit-resource-types";
import { dateToISOEnd, dateToISOStart } from "@/lib/formatters";

const LOG_FILTER_DEBOUNCE_MS = 250;
export const ACTOR_TYPE_FILTERS = ["all", "user", "display"] as const;
export type ActorTypeFilter = (typeof ACTOR_TYPE_FILTERS)[number];

export function useAuditLogFilters(pageSize: number) {
  const [page, setPage] = useQueryNumberState("page", 1);
  const [from, setFrom] = useQueryStringState("from", "");
  const [to, setTo] = useQueryStringState("to", "");
  const [action, setAction] = useQueryStringState("action", "");
  const [actionDraft, setActionDraft] = useState(action);
  const [requestId, setRequestId] = useQueryStringState("requestId", "");
  const [requestIdDraft, setRequestIdDraft] = useState(requestId);
  const [resourceType, setResourceType] = useQueryEnumState<ResourceTypeFilter>(
    "resourceType",
    "",
    RESOURCE_TYPE_FILTER_OPTIONS,
  );
  const [resourceTypeInput, setResourceTypeInput] = useState<string>("");
  const [statusRaw, setStatusRaw] = useQueryStringState("status", "");
  const [actorType, setActorType] = useQueryEnumState<ActorTypeFilter>(
    "actorType",
    "all",
    ACTOR_TYPE_FILTERS,
  );

  useEffect(() => {
    setResourceTypeInput(
      resourceType === "" ? "" : getResourceTypeLabel(resourceType),
    );
  }, [resourceType]);

  useEffect(() => {
    setActionDraft(action);
  }, [action]);

  useEffect(() => {
    setRequestIdDraft(requestId);
  }, [requestId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (actionDraft === action) {
        return;
      }
      setAction(actionDraft);
      if (page !== 1) {
        setPage(1);
      }
    }, LOG_FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [action, actionDraft, page, setAction, setPage]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (requestIdDraft === requestId) {
        return;
      }
      setRequestId(requestIdDraft);
      if (page !== 1) {
        setPage(1);
      }
    }, LOG_FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [page, requestId, requestIdDraft, setPage, setRequestId]);

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
      action: action || undefined,
      actorType: actorType === "all" ? undefined : actorType,
      resourceType: resourceType || undefined,
      status: parsedStatus,
      requestId: requestId || undefined,
    }),
    [
      action,
      actorType,
      from,
      page,
      pageSize,
      parsedStatus,
      requestId,
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
    actionDraft,
    setActionDraft,
    requestId,
    setRequestId,
    requestIdDraft,
    setRequestIdDraft,
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
