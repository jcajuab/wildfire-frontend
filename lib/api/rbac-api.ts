import { createApi } from "@reduxjs/toolkit/query/react";
import { emitAuthRefreshRequested } from "@/lib/auth-events";
import {
  parseApiListResponseSafe,
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
  readonly username: string;
  readonly email: string | null;
  readonly name: string;
  readonly isActive: boolean;
  readonly lastSeenAt?: string | null;
  /** Presigned avatar URL when user has profile picture in MinIO. */
  readonly avatarUrl?: string | null;
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
  },
});

export const rbacApi = createApi({
  reducerPath: "rbacApi",
  baseQuery,
  tagTypes: ["Role", "User", "Permission"],
  endpoints: (build) => ({
    // Roles
    getRoles: build.query<RbacRole[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacRole[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("roles"),
            };
          }

          const result = await baseQueryFn({
            url: "roles",
            params: { page, pageSize: PAGE_SIZE },
          });
          if (result.error) {
            return { error: result.error };
          }

          let parsed: ReturnType<typeof parseApiListResponseSafe<RbacRole>>;
          try {
            parsed = parseApiListResponseSafe<RbacRole>(
              result.data,
              "getRoles",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getRoles", error),
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
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<RbacPermission>(
          response,
          "setRolePermissions",
        );
        return [...parsed.data];
      },
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

    // Permissions
    getPermissions: build.query<RbacPermission[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacPermission[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("permissions"),
            };
          }

          const result = await baseQueryFn({
            url: "permissions",
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
              "getPermissions",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getPermissions", error),
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
      async queryFn(_arg, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacUser[] = [];

        while (true) {
          if (page > MAX_PAGES) {
            return {
              error: paginationLimitError("users"),
            };
          }

          const result = await baseQueryFn({
            url: "users",
            params: { page, pageSize: PAGE_SIZE },
          });
          if (result.error) {
            return { error: result.error };
          }

          let parsed: ReturnType<typeof parseApiListResponseSafe<RbacUser>>;
          try {
            parsed = parseApiListResponseSafe<RbacUser>(
              result.data,
              "getUsers",
            );
          } catch (error) {
            return {
              error: {
                status: 502,
                data: buildResponseParseError("getUsers", error),
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
    getUserRoles: build.query<RbacRole[], string>({
      async queryFn(userId, _api, _extraOptions, baseQueryFn) {
        let page = 1;
        let total = 0;
        const allItems: RbacRole[] = [];

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

          let parsed: ReturnType<typeof parseApiListResponseSafe<RbacRole>>;
          try {
            parsed = parseApiListResponseSafe<RbacRole>(
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
      RbacRole[],
      { userId: string; roleIds: string[] }
    >({
      query: ({ userId, roleIds }) => ({
        url: `users/${userId}/roles`,
        method: "PUT",
        body: { roleIds },
      }),
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<RbacRole>(
          response,
          "setUserRoles",
        );
        return [...parsed.data];
      },
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
