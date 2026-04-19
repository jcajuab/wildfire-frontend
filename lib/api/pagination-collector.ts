import type {
  FetchBaseQueryError,
  BaseQueryFn,
  FetchArgs,
} from "@reduxjs/toolkit/query/react";
import { parseApiListResponseSafe } from "@/lib/api/contracts";

export const PAGE_SIZE = 100;
export const MAX_PAGES = 100;
const MAX_CONCURRENCY = 5;

export type PaginatedBaseQuery = BaseQueryFn<
  FetchArgs,
  unknown,
  FetchBaseQueryError
>;

export const paginationLimitError = (scope: string) => ({
  status: 500 as const,
  data: `Failed to load ${scope}: pagination limit reached.`,
});

export const buildResponseParseError = (scope: string, error: unknown) => ({
  error: {
    code: "INVALID_API_RESPONSE",
    message:
      error instanceof Error
        ? `${scope}: ${error.message}`
        : "Response payload does not match API contract.",
    requestId: "frontend-contract-parser",
  },
});

const buildPaginatedParseError = (
  scope: string,
  error: unknown,
): FetchBaseQueryError => ({
  status: 502,
  data: buildResponseParseError(scope, error),
});

/**
 * Collect all pages from a paginated API endpoint.
 *
 * Fetches page 1 to determine the total, then fetches remaining pages
 * in parallel (up to {@link MAX_CONCURRENCY} concurrent requests).
 */
export const collectAllPages = async <T>(input: {
  scope: string;
  parseScope: string;
  url: string;
  baseQueryFn: PaginatedBaseQuery;
}): Promise<T[]> => {
  const fetchPage = async (page: number) => {
    const result = await input.baseQueryFn(
      { url: input.url, params: { page, pageSize: PAGE_SIZE } },
      {} as never,
      {} as never,
    );
    if (result.error) {
      throw result.error;
    }
    try {
      return parseApiListResponseSafe<T>(result.data, input.parseScope);
    } catch (error) {
      throw buildPaginatedParseError(input.parseScope, error);
    }
  };

  // Fetch first page to learn the total
  const firstPage = await fetchPage(1);
  const total = firstPage.meta.total;
  const allItems: T[] = [...firstPage.data];

  if (allItems.length >= total || firstPage.data.length === 0) {
    return allItems;
  }

  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);
  if (totalPages > MAX_PAGES) {
    throw paginationLimitError(input.scope) as FetchBaseQueryError;
  }

  // Fetch remaining pages in parallel with concurrency limit
  const remainingPages = Array.from(
    { length: totalPages - 1 },
    (_, i) => i + 2,
  );

  for (let i = 0; i < remainingPages.length; i += MAX_CONCURRENCY) {
    const batch = remainingPages.slice(i, i + MAX_CONCURRENCY);
    const results = await Promise.all(batch.map(fetchPage));
    for (const result of results) {
      allItems.push(...result.data);
    }
  }

  return allItems;
};
