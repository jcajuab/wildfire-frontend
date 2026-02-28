import { createApi } from "@reduxjs/toolkit/query/react";
import { emitAuthRefreshRequested } from "@/lib/auth-events";
import {
  parseApiListResponseDataSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { baseQuery } from "@/lib/api/base-query";
import type { PermissionAction, PermissionResource } from "@/types/permission";

/** Backend RBAC response shapes (match overview). */
export interface RbacRole {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly isSystem: boolean;
  /** Number of users assigned to this role (from GET /roles). */
  readonly usersCount: number;
}

export interface RbacPermission {
  readonly id: string;
  readonly resource: PermissionResource;
  readonly action: PermissionAction;
}

export interface RbacUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly lastSeenAt?: string | null;
  /** Presigned avatar URL when user has profile picture in MinIO. */
  readonly avatarUrl?: string | null;
}

export interface RbacRoleDeletionRequest {
  readonly id: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly requestedByUserId: string;
  readonly requestedByName: string;
  readonly requestedByEmail: string;
  readonly requestedAt: string;
  readonly status: "pending" | "approved" | "rejected" | "cancelled";
  readonly approvedByUserId: string | null;
  readonly approvedByName: string | null;
  readonly approvedByEmail: string | null;
  readonly approvedAt: string | null;
  readonly reason: string | null;
}

export const rbacApi = createApi({
  reducerPath: "rbacApi",
  baseQuery,
  tagTypes: ["Role", "User", "Permission", "RoleDeletionRequest"],
  endpoints: (build) => ({
    // Roles
    getRoles: build.query<RbacRole[], void>({
      query: () => "roles",
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacRole>(response, "getRoles"),
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
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRole>(response, "getRole"),
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
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRole>(response, "createRole"),
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
      RbacRole,
      { id: string; name?: string; description?: string | null }
    >({
      query: ({ id, ...body }) => ({
        url: `roles/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRole>(response, "updateRole"),
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
        { type: "RoleDeletionRequest", id: "LIST" },
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
      query: (roleId) => `roles/${roleId}/permissions`,
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacPermission>(
          response,
          "getRolePermissions",
        ),
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
      query: (roleId) => `roles/${roleId}/users`,
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacUser>(response, "getRoleUsers"),
      providesTags: (_result, _error, roleId) => [
        { type: "Role", id: roleId },
        { type: "User", id: "LIST" },
      ],
    }),

    // Permissions
    getPermissions: build.query<RbacPermission[], void>({
      query: () => "permissions",
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacPermission>(
          response,
          "getPermissions",
        ),
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
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacUser>(response, "getUsers"),
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
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser>(response, "getUser"),
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
      { id: string; email?: string; name?: string; isActive?: boolean }
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
    getUserRoles: build.query<RbacRole[], string>({
      query: (userId) => `users/${userId}/roles`,
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacRole>(response, "getUserRoles"),
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
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRole[]>(response, "setUserRoles"),
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
    createRoleDeletionRequest: build.mutation<
      void,
      { roleId: string; reason?: string }
    >({
      query: ({ roleId, reason }) => ({
        url: `roles/${roleId}/deletion-requests`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: [{ type: "RoleDeletionRequest", id: "LIST" }],
    }),
    getRoleDeletionRequests: build.query<RbacRoleDeletionRequest[], void>({
      query: () => "roles/deletion-requests",
      transformResponse: (response) =>
        parseApiListResponseDataSafe<RbacRoleDeletionRequest>(
          response,
          "getRoleDeletionRequests",
        ),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "RoleDeletionRequest" as const,
                id,
              })),
              { type: "RoleDeletionRequest", id: "LIST" },
            ]
          : [{ type: "RoleDeletionRequest", id: "LIST" }],
    }),
    approveRoleDeletionRequest: build.mutation<void, { requestId: string }>({
      query: ({ requestId }) => ({
        url: `roles/deletion-requests/${requestId}/approve`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "RoleDeletionRequest", id: "LIST" },
        { type: "Role", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
    }),
    rejectRoleDeletionRequest: build.mutation<
      void,
      { requestId: string; reason?: string }
    >({
      query: ({ requestId, reason }) => ({
        url: `roles/deletion-requests/${requestId}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: [{ type: "RoleDeletionRequest", id: "LIST" }],
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
  useCreateRoleDeletionRequestMutation,
  useGetRoleDeletionRequestsQuery,
  useApproveRoleDeletionRequestMutation,
  useRejectRoleDeletionRequestMutation,
} = rbacApi;
