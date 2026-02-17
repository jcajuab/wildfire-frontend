import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";

/** Backend RBAC response shapes (match overview). */
export interface RbacRole {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  /** Number of users assigned to this role (from GET /roles). */
  readonly usersCount?: number;
}

export interface RbacPermission {
  readonly id: string;
  readonly resource: string;
  readonly action: string;
}

export interface RbacUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly isActive: boolean;
  /** Presigned avatar URL when user has profile picture in MinIO. */
  readonly avatarUrl?: string | null;
}

export const rbacApi = createApi({
  reducerPath: "rbacApi",
  baseQuery,
  tagTypes: ["Role", "User", "Permission"],
  endpoints: (build) => ({
    // Roles
    getRoles: build.query<RbacRole[], void>({
      query: () => "roles",
      transformResponse: (response: { items: RbacRole[] }) => response.items,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),
    getRole: build.query<RbacRole, string>({
      query: (id) => `roles/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Role", id }],
    }),
    createRole: build.mutation<
      RbacRole,
      { name: string; description?: string | null }
    >({
      query: (body) => ({
        url: "roles",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),
    updateRole: build.mutation<
      RbacRole,
      { id: string; name?: string; description?: string | null }
    >({
      query: ({ id, ...body }) => ({
        url: `roles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
    deleteRole: build.mutation<void, string>({
      query: (id) => ({ url: `roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
    getRolePermissions: build.query<RbacPermission[], string>({
      query: (roleId) => `roles/${roleId}/permissions`,
      providesTags: (_result, _error, roleId) => [
        { type: "Role", id: roleId },
        { type: "Permission", id: "LIST" },
      ],
    }),
    setRolePermissions: build.mutation<
      RbacPermission[],
      { roleId: string; permissionIds: string[]; policyVersion?: number }
    >({
      query: ({ roleId, permissionIds, policyVersion }) => ({
        url: `roles/${roleId}/permissions`,
        method: "PUT",
        body: { permissionIds, policyVersion },
      }),
      invalidatesTags: (_result, _error, { roleId }) => [
        { type: "Role", id: roleId },
        { type: "Permission", id: "LIST" },
      ],
    }),
    getRoleUsers: build.query<RbacUser[], string>({
      query: (roleId) => `roles/${roleId}/users`,
      providesTags: (_result, _error, roleId) => [
        { type: "Role", id: roleId },
        { type: "User", id: "LIST" },
      ],
    }),

    // Permissions
    getPermissions: build.query<RbacPermission[], void>({
      query: () => "permissions",
      transformResponse: (response: { items: RbacPermission[] }) =>
        response.items,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Permission" as const, id })),
              { type: "Permission", id: "LIST" },
            ]
          : [{ type: "Permission", id: "LIST" }],
    }),

    // Users
    getUsers: build.query<RbacUser[], void>({
      query: () => "users",
      transformResponse: (response: { items: RbacUser[] }) => response.items,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "User" as const, id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),
    getUser: build.query<RbacUser, string>({
      query: (id) => `users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),
    createUser: build.mutation<
      RbacUser,
      { email: string; name: string; isActive?: boolean }
    >({
      query: (body) => ({
        url: "users",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: build.mutation<
      RbacUser,
      { id: string; email?: string; name?: string; isActive?: boolean }
    >({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    getUserRoles: build.query<RbacRole[], string>({
      query: (userId) => `users/${userId}/roles`,
      providesTags: (_result, _error, userId) => [
        { type: "User", id: userId },
        { type: "Role", id: "LIST" },
      ],
    }),
    setUserRoles: build.mutation<
      RbacRole[],
      { userId: string; roleIds: string[]; policyVersion?: number }
    >({
      query: ({ userId, roleIds, policyVersion }) => ({
        url: `users/${userId}/roles`,
        method: "PUT",
        body: { roleIds, policyVersion },
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "Role", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetRolePermissionsQuery,
  useSetRolePermissionsMutation,
  useGetRoleUsersQuery,
  useGetPermissionsQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserRolesQuery,
  useLazyGetUserRolesQuery,
  useSetUserRolesMutation,
} = rbacApi;
