import type { DisplaysListQuery } from "@/lib/api/displays-api";

export const DISPLAYS_PAGE_SIZE = 20;

const DISPLAY_STATUS_VALUES = ["all", "READY", "LIVE", "DOWN"] as const;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function displaysBootstrapQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = DISPLAYS_PAGE_SIZE,
): DisplaysListQuery {
  const pageRaw = first(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  const qRaw = first(searchParams.q)?.trim() ?? "";
  const q = qRaw === "" ? undefined : qRaw;

  const statusRaw = first(searchParams.status)?.trim() ?? "all";
  const status =
    statusRaw !== "all" &&
    (DISPLAY_STATUS_VALUES as readonly string[]).includes(statusRaw)
      ? (statusRaw as DisplaysListQuery["status"])
      : undefined;

  const groupsRaw = first(searchParams.groups)?.trim() ?? "";
  const groupNames =
    groupsRaw.length > 0
      ? groupsRaw
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];

  const outputRaw = first(searchParams.output)?.trim() ?? "all";
  const output =
    outputRaw === "all" || outputRaw === "" ? undefined : outputRaw;

  return {
    page,
    pageSize,
    q,
    status,
    groupNames: groupNames.length > 0 ? groupNames : undefined,
    output,
    sortBy: "name",
    sortDirection: "asc",
  };
}
