import { parseApiListResponseSafe } from "@/lib/api/contracts";

/**
 * Standard paginated list response shape.
 */
export interface PaginatedListResponse<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Transform raw API list response into standardized paginated list response.
 *
 * This transformer parses the API envelope and extracts pagination metadata
 * into a consistent shape used by RTK Query endpoints.
 *
 * @param response - Raw API response payload
 * @param scope - Scope identifier for parsing errors (e.g., "getRoles")
 * @returns Transformed paginated list response
 *
 * @example
 * ```ts
 * getRoles: build.query<PaginatedListResponse<RbacRoleListItem>, RbacRoleListQuery>({
 *   query: (query) => ({ url: "roles", params: query }),
 *   transformResponse: (response) =>
 *     transformPaginatedListResponse<RbacRoleListItem>(response, "getRoles"),
 * })
 * ```
 */
export const transformPaginatedListResponse = <T>(
  response: unknown,
  scope: string,
): PaginatedListResponse<T> => {
  const parsed = parseApiListResponseSafe<T>(response, scope);
  return {
    items: parsed.data,
    total: parsed.meta.total,
    page: parsed.meta.page,
    pageSize: parsed.meta.pageSize,
  };
};
