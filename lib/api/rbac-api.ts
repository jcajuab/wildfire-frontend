import { createApi } from "@reduxjs/toolkit/query/react";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { createPaginatedQueryFn } from "@/lib/api/paginated-query-factory";
import { refreshAuthAfterMutation } from "@/lib/api/auth-refresh.helpers";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";

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

// Note: These response types maintain backward compatibility but can be
// replaced with PaginatedListResponse<T> from response-transformers.ts
// in future refactoring.

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

// All pagination, auth refresh, and response transformation utilities
// have been extracted to shared modules for reuse across API files.

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
      transformResponse: (response) =>
        transformPaginatedListResponse<RbacRoleListItem>(response, "getRoles"),
      providesTags: createProvidesTags("Role"),
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
      onQueryStarted: refreshAuthAfterMutation,
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
      onQueryStarted: refreshAuthAfterMutation,
    }),
    deleteRole: build.mutation<void, string>({
      query: (id) => ({ url: `roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
      onQueryStarted: refreshAuthAfterMutation,
    }),
    getRolePermissions: build.query<RbacPermission[], string>({
      queryFn: createPaginatedQueryFn<RbacPermission>({
        scope: "role permissions",
        parseScope: "getRolePermissions",
        getUrl: (roleId) => `roles/${roleId}/permissions`,
      }),
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
      onQueryStarted: refreshAuthAfterMutation,
    }),
    getRoleUsers: build.query<RbacUser[], string>({
      queryFn: createPaginatedQueryFn<RbacUser>({
        scope: "role users",
        parseScope: "getRoleUsers",
        getUrl: (roleId) => `roles/${roleId}/users`,
      }),
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
      transformResponse: (response) =>
        transformPaginatedListResponse<RbacUser>(response, "getUsers"),
      providesTags: createProvidesTags("User"),
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
      onQueryStarted: refreshAuthAfterMutation,
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
      onQueryStarted: refreshAuthAfterMutation,
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
      onQueryStarted: refreshAuthAfterMutation,
    }),
    getUserRoles: build.query<RbacRoleSummary[], string>({
      queryFn: createPaginatedQueryFn<RbacRoleSummary>({
        scope: "user roles",
        parseScope: "getUserRoles",
        getUrl: (userId) => `users/${userId}/roles`,
      }),
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
      onQueryStarted: refreshAuthAfterMutation,
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
