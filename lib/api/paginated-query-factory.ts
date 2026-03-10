import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import {
  collectAllPages,
  type PaginatedBaseQuery,
} from "@/lib/api/pagination-collector";

/**
 * Create a paginated query function for RTK Query endpoints.
 *
 * This factory generates queryFn implementations that automatically
 * collect all pages from a paginated API endpoint.
 *
 * @param input - Configuration for the paginated query
 * @param input.scope - Human-readable scope for error messages (e.g., "role permissions")
 * @param input.parseScope - Scope identifier for parsing errors (e.g., "getRolePermissions")
 * @param input.getUrl - Function that generates the API URL from the query argument
 * @returns RTK Query queryFn that returns all items across all pages
 *
 * @example
 * ```ts
 * getRolePermissions: build.query<RbacPermission[], string>({
 *   queryFn: createPaginatedQueryFn<RbacPermission>({
 *     scope: "role permissions",
 *     parseScope: "getRolePermissions",
 *     getUrl: (roleId) => `roles/${roleId}/permissions`,
 *   }),
 * })
 * ```
 */
export const createPaginatedQueryFn =
  <T>(input: {
    scope: string;
    parseScope: string;
    getUrl: (id: string) => string;
  }) =>
  async (
    id: string,
    _api: unknown,
    _extraOptions: unknown,
    baseQueryFn: PaginatedBaseQuery,
  ) => {
    try {
      return {
        data: await collectAllPages<T>({
          scope: input.scope,
          parseScope: input.parseScope,
          url: input.getUrl(id),
          baseQueryFn,
        }),
      };
    } catch (error) {
      return {
        error: error as FetchBaseQueryError,
      };
    }
  };
