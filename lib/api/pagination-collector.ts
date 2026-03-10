import type {
  FetchBaseQueryError,
  BaseQueryFn,
  FetchArgs,
} from "@reduxjs/toolkit/query/react";
import { parseApiListResponseSafe } from "@/lib/api/contracts";

export const PAGE_SIZE = 100;
export const MAX_PAGES = 100;

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
 * @param input - Configuration for pagination collection
 * @param input.scope - Human-readable scope for error messages (e.g., "role permissions")
 * @param input.parseScope - Scope identifier for parsing errors (e.g., "getRolePermissions")
 * @param input.url - API endpoint URL
 * @param input.baseQueryFn - RTK Query base query function
 * @returns Promise resolving to array of all items across all pages
 * @throws {FetchBaseQueryError} If pagination limit reached or API request fails
 */
export const collectAllPages = async <T>(input: {
  scope: string;
  parseScope: string;
  url: string;
  baseQueryFn: PaginatedBaseQuery;
}): Promise<T[]> => {
  let page = 1;
  let total = 0;
  const allItems: T[] = [];

  while (true) {
    if (page > MAX_PAGES) {
      throw paginationLimitError(input.scope) as FetchBaseQueryError;
    }

    const result = await input.baseQueryFn(
      { url: input.url, params: { page, pageSize: PAGE_SIZE } },
      {} as never, // api - not needed for our use
      {} as never, // extraOptions - not needed for our use
    );
    if (result.error) {
      throw result.error;
    }

    let parsed: ReturnType<typeof parseApiListResponseSafe<T>>;
    try {
      parsed = parseApiListResponseSafe<T>(result.data, input.parseScope);
    } catch (error) {
      throw buildPaginatedParseError(input.parseScope, error);
    }

    total = parsed.meta.total;
    allItems.push(...parsed.data);
    if (allItems.length >= total || parsed.data.length === 0) {
      break;
    }
    page += 1;
  }

  return allItems;
};
