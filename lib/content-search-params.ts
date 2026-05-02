import type {
  ContentListQuery,
  ContentOptionsQueryArg,
} from "@/lib/api/content-api";

/** Matches playlist pickers (`getContentOptions` / SSR `content/options`). */
export const PLAYLIST_CONTENT_PICKER_OPTIONS_QUERY = {
  status: "READY" as const,
} satisfies Extract<ContentOptionsQueryArg, object>;

/** Matches admin content grid page size (paginated grid UX). */
export const CONTENT_PAGE_SIZE = 12;

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "FLASH", "TEXT"] as const;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function contentListQueryFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  pageSize = CONTENT_PAGE_SIZE,
): ContentListQuery {
  const pageRaw = first(searchParams.page);
  const page =
    pageRaw != null ? Math.max(1, Number.parseInt(pageRaw, 10) || 1) : 1;

  const searchRaw = first(searchParams.q)?.trim() ?? "";
  const search = searchRaw === "" ? undefined : searchRaw;

  const statusRaw = first(searchParams.status)?.trim() ?? "all";
  const status =
    statusRaw !== "all" &&
    (CONTENT_STATUS_VALUES as readonly string[]).includes(statusRaw)
      ? (statusRaw as ContentListQuery["status"])
      : undefined;

  const typeRaw = first(searchParams.type)?.trim() ?? "all";
  const type =
    typeRaw !== "all" &&
    (CONTENT_TYPE_VALUES as readonly string[]).includes(typeRaw)
      ? (typeRaw as ContentListQuery["type"])
      : undefined;

  return {
    page,
    pageSize,
    status,
    type,
    search,
    sortBy: "createdAt",
    sortDirection: "desc",
  };
}
