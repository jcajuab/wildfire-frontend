import { createApi } from "@reduxjs/toolkit/query/react";
import { emitAuthRefreshRequested } from "@/lib/auth-events";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import type { PermissionAction, PermissionResource } from "@/types/permission";

export interface RbacRoleSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
}

export interface RbacRoleListItem extends RbacRoleSummary {
  readonly usersCount: number;
}

export interface RbacPermission {
  readonly id: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

export interface RbacUserRoleSummary {
  readonly id: string;
  readonly name: string;
}

export interface RbacUser {
  readonly id: string;
  readonly username: string;
  readonly email: string | null;
  readonly name: string;
  readonly isActive: boolean;
  readonly lastSeenAt?: string | null;
  readonly avatarUrl?: string | null;
  readonly roles?: readonly RbacUserRoleSummary[];
}

export interface RbacRolesListResponse {
  readonly items: readonly RbacRoleListItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface RbacUsersListResponse {
  readonly items: readonly RbacUser[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface RbacRoleListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly q?: string;
  readonly sortBy?: "name" | "usersCount";
  readonly sortDirection?: "asc" | "desc";
}

export interface RbacUserListQuery {
  readonly page?: number;
  readonly pageSize?: number;
  readonly q?: string;
  readonly sortBy?: "name" | "lastSeenAt";
  readonly sortDirection?: "asc" | "desc";
}

const PAGE_SIZE = 100;
const MAX_PAGES = 100;

const paginationLimitError = (scope: string) => ({
  status: 500 as const,
  data: `Failed to load ${scope}: pagination limit reached.`,
});

const buildResponseParseError = (scope: string, error: unknown) => ({
  error: {
    code: "INVALID_API_RESPONSE",
    message:
      error instanceof Error
        ? `${scope}: ${error.message}`
        : "Response payload does not match API contract.",
    requestId: "frontend-contract-parser",
  },
});

export const rbacApi = createApi({
  reducerPath: "rbacApi",
  baseQuery,
  tagTypes: ["Role", "User", "Permission"],
  endpoints: (build) => ({
    getRoles: build.query<RbacRolesListResponse, RbacRoleListQuery | void>({
      query: (query) => ({
        url: "roles",
        params: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          q: query?.q,
          sortBy: query?.sortBy ?? "name",
          sortDirection: query?.sortDirection ?? "asc",
        },
      }),
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<RbacRoleListItem>(
          response,
          "getRoles",
        );
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.pageSize,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),
    getRoleOptions: build.query<
      RbacRoleSummary[],
      { q?: string; limit?: number } | void
    >({
      query: (query) => ({
        url: "roles/options",
        params: {
          q: query?.q,
          limit: query?.limit ?? 100,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary[]>(response, "getRoleOptions"),
    }),
    getRole: build.query<RbacRoleSummary, string>({
      query: (id) => `roles/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary>(response, "getRole"),
      providesTags: (_result, _error, id) => [{ type: "Role", id }],
    }),
    createRole: build.mutation<
      RbacRoleSummary,
      { name: string; description?: string | null }
    >({
      query: (body) => ({
        url: "roles",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary>(response, "createRole"),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    updateRole: build.mutation<
      RbacRoleSummary,
      { id: string; name?: string; description?: string | null }
    >({
      query: ({ id, ...body }) => ({
        url: `roles/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary>(response, "updateRole"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    deleteRole: build.mutation<void, string>({
      query: (id) => ({ url: `roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    getRolePermissions: build.query<RbacPermission[], string>({
      async queryFn(roleId, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacPermission[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("role permissions"),
            };
          }

          const result = await baseQueryFn({
            url: `roles/${roleId}/permissions`,
            params: { page, pageSize: PAGE_SIZE },
          });
          if (result.error) {
            return { error: result.error };
          }

          let parsed: ReturnType<
            typeof parseApiListResponseSafe<RbacPermission>
          >;
          try {
            parsed = parseApiListResponseSafe<RbacPermission>(
              result.data,
              "getRolePermissions",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getRolePermissions", error),
              },
            };
          }

          total = parsed.meta.total;
          allItems.push(...parsed.data);
          if (allItems.length >= total || parsed.data.length === 0) {
            break;
          }
          page += 1;
        }

        return { data: allItems };
      },
      providesTags: (_result, _error, roleId) => [
        { type: "Role", id: roleId },
        { type: "Permission", id: "LIST" },
      ],
    }),
    setRolePermissions: build.mutation<
      RbacPermission[],
      { roleId: string; permissionIds: string[] }
    >({
      query: ({ roleId, permissionIds }) => ({
        url: `roles/${roleId}/permissions`,
        method: "PUT",
        body: { permissionIds },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacPermission[]>(
          response,
          "setRolePermissions",
        ),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: "Role", id: roleId },
        { type: "Role", id: "LIST" },
        { type: "Permission", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    getRoleUsers: build.query<RbacUser[], string>({
      async queryFn(roleId, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacUser[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("role users"),
            };
          }

          const result = await baseQueryFn({
            url: `roles/${roleId}/users`,
            params: { page, pageSize: PAGE_SIZE },
          });
          if (result.error) {
            return { error: result.error };
          }

          let parsed: ReturnType<typeof parseApiListResponseSafe<RbacUser>>;
          try {
            parsed = parseApiListResponseSafe<RbacUser>(
              result.data,
              "getRoleUsers",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getRoleUsers", error),
              },
            };
          }

          total = parsed.meta.total;
          allItems.push(...parsed.data);
          if (allItems.length >= total || parsed.data.length === 0) {
            break;
          }
          page += 1;
        }

        return { data: allItems };
      },
      providesTags: (_result, _error, roleId) => [
        { type: "Role", id: roleId },
        { type: "User", id: "LIST" },
      ],
    }),
    getPermissions: build.query<RbacPermission[], void>({
      query: () => "permissions/options",
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacPermission[]>(response, "getPermissions"),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Permission" as const, id })),
              { type: "Permission", id: "LIST" },
            ]
          : [{ type: "Permission", id: "LIST" }],
    }),
    getUsers: build.query<RbacUsersListResponse, RbacUserListQuery | void>({
      query: (query) => ({
        url: "users",
        params: {
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          q: query?.q,
          sortBy: query?.sortBy ?? "name",
          sortDirection: query?.sortDirection ?? "asc",
        },
      }),
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<RbacUser>(response, "getUsers");
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.pageSize,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "User" as const, id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),
    getUserOptions: build.query<
      RbacUser[],
      { q?: string; limit?: number } | void
    >({
      query: (query) => ({
        url: "users/options",
        params: {
          q: query?.q,
          limit: query?.limit ?? 100,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser[]>(response, "getUserOptions"),
    }),
    getUser: build.query<RbacUser, string>({
      query: (id) => `users/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser>(response, "getUser"),
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),
    createUser: build.mutation<
      RbacUser,
      {
        username: string;
        email?: string | null;
        name: string;
        isActive?: boolean;
      }
    >({
      query: (body) => ({
        url: "users",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser>(response, "createUser"),
      invalidatesTags: [{ type: "User", id: "LIST" }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    updateUser: build.mutation<
      RbacUser,
      {
        id: string;
        username?: string;
        email?: string | null;
        name?: string;
        isActive?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser>(response, "updateUser"),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
    getUserRoles: build.query<RbacRoleSummary[], string>({
      async queryFn(userId, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacRoleSummary[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("user roles"),
            };
          }

          const result = await baseQueryFn({
            url: `users/${userId}/roles`,
            params: { page, pageSize: PAGE_SIZE },
          });
          if (result.error) {
            return { error: result.error };
          }

          let parsed: ReturnType<typeof parseApiListResponseSafe<RbacRoleSummary>>;
          try {
            parsed = parseApiListResponseSafe<RbacRoleSummary>(
              result.data,
              "getUserRoles",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getUserRoles", error),
              },
            };
          }

          total = parsed.meta.total;
          allItems.push(...parsed.data);
          if (allItems.length >= total || parsed.data.length === 0) {
            break;
          }
          page += 1;
        }

        return { data: allItems };
      },
      providesTags: (_result, _error, userId) => [
        { type: "User", id: userId },
        { type: "Role", id: "LIST" },
      ],
    }),
    setUserRoles: build.mutation<
      RbacRoleSummary[],
      { userId: string; roleIds: string[] }
    >({
      query: ({ userId, roleIds }) => ({
        url: `users/${userId}/roles`,
        method: "PUT",
        body: { roleIds },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary[]>(response, "setUserRoles"),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
        { type: "Role", id: "LIST" },
        { type: "Permission", id: "LIST" },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          emitAuthRefreshRequested();
        } catch {
          // Ignore failed writes.
        }
      },
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleOptionsQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetRolePermissionsQuery,
  useSetRolePermissionsMutation,
  useGetRoleUsersQuery,
  useGetPermissionsQuery,
  useGetUsersQuery,
  useGetUserOptionsQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,
  useSetUserRolesMutation,
} = rbacApi;
