import type { ContentListQuery } from "@/lib/api/content-api";
import { ADMIN_CARD_PAGE_SIZE } from "@/lib/admin-pagination";

/** Matches admin content grid page size (paginated grid UX). */
export const CONTENT_PAGE_SIZE = ADMIN_CARD_PAGE_SIZE;

const CONTENT_STATUS_VALUES = ["all", "PROCESSING", "READY", "FAILED"] as const;
const CONTENT_TYPE_VALUES = ["all", "IMAGE", "VIDEO", "FLASH", "TEXT"] as const;
const CONTENT_SORT_VALUES = [
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
  "file-size-desc",
  "file-size-asc",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  const ownerIdRaw = first(searchParams.ownerId)?.trim();
  const ownerId =
    ownerIdRaw != null && UUID_PATTERN.test(ownerIdRaw)
      ? ownerIdRaw
      : undefined;

  const sortRaw = first(searchParams.sort)?.trim() ?? "newest";
  const sort = (CONTENT_SORT_VALUES as readonly string[]).includes(sortRaw)
    ? sortRaw
    : "newest";
  const sortBy =
    sort === "title-asc" || sort === "title-desc"
      ? "title"
      : sort === "file-size-desc" || sort === "file-size-asc"
        ? "fileSize"
        : "createdAt";
  const sortDirection =
    sort === "oldest" || sort === "title-asc" || sort === "file-size-asc"
      ? "asc"
      : "desc";

  return {
    page,
    pageSize,
    status,
    type,
    ownerId,
    search,
    sortBy,
    sortDirection,
  };
}
