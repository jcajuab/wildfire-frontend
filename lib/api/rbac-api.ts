import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import { api } from "@/lib/api/api";
import { patchPaginatedListById } from "@/lib/api/cache-patches";
import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import type { ServerCacheTag } from "@/lib/server/api";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { createPaginatedQueryFn } from "@/lib/api/paginated-query-factory";
import { refreshAuthAfterMutation } from "@/lib/api/auth-refresh.helpers";
import { transformPaginatedListResponse } from "@/lib/api/response-transformers";
import { createProvidesTags } from "@/lib/api/provide-tags";
import { applyMutationCacheEffects } from "@/lib/api/cache-side-effects";

async function bumpRbacNextCache(
  tags: readonly ServerCacheTag[],
): Promise<void> {
  try {
    await revalidateWildfireTagsViaRoute(tags);
  } catch {
    // best-effort
  }
}

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
  readonly isInvitedUser?: boolean;
  readonly bannedAt?: string | null;
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
  readonly roleId?: string;
  readonly sortBy?: "name" | "email" | "lastSeenAt";
  readonly sortDirection?: "asc" | "desc";
}

type RoleListMutable = Omit<RbacRolesListResponse, "items"> & {
  items: RbacRoleListItem[];
};

type RoleEditBootstrapMutable = Omit<
  RoleEditBootstrapResponse,
  "role" | "rolePermissions"
> & {
  role: RbacRoleSummary;
  rolePermissions: RbacPermission[];
};

type UserListMutable = Omit<RbacUsersListResponse, "items"> & {
  items: RbacUser[];
};

export interface RoleEditBootstrapResponse {
  readonly role: RbacRoleSummary;
  readonly permissions: RbacPermission[];
  readonly rolePermissions: RbacPermission[];
  readonly roleUsers: RbacUser[];
}

export const rbacApi = api.injectEndpoints({
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
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),
    getRole: build.query<RbacRoleSummary, string>({
      query: (id) => `roles/${id}`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacRoleSummary>(response, "getRole"),
      providesTags: (_result, _error, id) => [{ type: "Role", id }],
    }),
    getRoleEditBootstrap: build.query<RoleEditBootstrapResponse, string>({
      query: (id) => `roles/${id}/bootstrap`,
      transformResponse: (response) =>
        parseApiResponseDataSafe<RoleEditBootstrapResponse>(
          response,
          "getRoleEditBootstrap",
        ),
      providesTags: (_result, _error, id) => [
        { type: "Role", id },
        { type: "Permission", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
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
      async onQueryStarted(_arg, api) {
        try {
          const { data } = await api.queryFulfilled;
          const row: RbacRoleListItem = { ...data, usersCount: 0 };
          const roleArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getRoles",
          );
          for (const ra of roleArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getRoles", ra, (draft) => {
                patchPaginatedListById(draft, "add", row, {
                  position: "start",
                });
              }),
            );
          }
          await bumpRbacNextCache(["roles-list", "roles-options"]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(_arg, api);
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
      async onQueryStarted(arg, api) {
        try {
          const { data } = await api.queryFulfilled;
          const roleArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getRoles",
          );
          for (const ra of roleArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getRoles", ra, (draft) => {
                const d = draft as unknown as RoleListMutable;
                const idx = d.items.findIndex((r) => r.id === arg.id);
                if (idx === -1) return;
                d.items = d.items.map((r, i) =>
                  i === idx ? { ...r, ...data, usersCount: r.usersCount } : r,
                );
              }),
            );
          }
          api.dispatch(
            rbacApi.util.updateQueryData("getRole", arg.id, () => data),
          );
          const bootstrapArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getRoleEditBootstrap",
          );
          for (const ba of bootstrapArgs) {
            if (ba !== arg.id) continue;
            api.dispatch(
              rbacApi.util.updateQueryData(
                "getRoleEditBootstrap",
                ba,
                (draft) => {
                  const ed = draft as unknown as RoleEditBootstrapMutable;
                  ed.role = data;
                },
              ),
            );
          }
          const userArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getUsers",
          );
          for (const ua of userArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getUsers", ua, (draft) => {
                const ud = draft as unknown as UserListMutable;
                ud.items = ud.items.map((u) => {
                  if (!u.roles) return u;
                  const ri = u.roles.findIndex((r) => r.id === arg.id);
                  if (ri === -1) return u;
                  const nextRoles = u.roles.map((r, i) =>
                    i === ri ? { id: data.id, name: data.name } : r,
                  );
                  return { ...u, roles: nextRoles };
                });
              }),
            );
          }
          await bumpRbacNextCache([
            "roles-list",
            "roles-options",
            "users-list",
            "role-edit-bootstrap",
          ]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(arg, api);
      },
    }),
    deleteRole: build.mutation<void, string>({
      query: (id) => ({ url: `roles/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        { type: "User", id: "LIST" },
      ],
      async onQueryStarted(id, api) {
        try {
          await api.queryFulfilled;
          const roleArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getRoles",
          );
          for (const ra of roleArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getRoles", ra, (draft) => {
                patchPaginatedListById(draft, "remove", {
                  id,
                } as RbacRoleListItem);
              }),
            );
          }
          await bumpRbacNextCache([
            "roles-list",
            "roles-options",
            "users-list",
          ]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(id, api);
      },
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
      async onQueryStarted({ roleId }, api) {
        try {
          const { data } = await api.queryFulfilled;
          api.dispatch(
            rbacApi.util.updateQueryData(
              "getRoleEditBootstrap",
              roleId,
              (draft) => {
                const ed = draft as unknown as RoleEditBootstrapMutable;
                ed.rolePermissions = data;
              },
            ),
          );
          await bumpRbacNextCache([
            "role-edit-bootstrap",
            "roles-list",
            "roles-options",
            "users-list",
            "users-options",
            "permissions-options",
          ]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation({ roleId }, api);
      },
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
      keepUnusedDataFor: 600,
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
          roleId: query?.roleId,
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
      keepUnusedDataFor: 30,
      query: (query) => ({
        url: "users/options",
        params: {
          q: query?.q,
          limit: query?.limit ?? 100,
        },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<RbacUser[]>(response, "getUserOptions"),
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
      async onQueryStarted(_arg, api) {
        try {
          const { data } = await api.queryFulfilled;
          const userArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getUsers",
          );
          for (const ua of userArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getUsers", ua, (draft) => {
                patchPaginatedListById(draft, "add", data, {
                  position: "start",
                });
              }),
            );
          }
          await bumpRbacNextCache(["users-list", "users-options"]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(_arg, api);
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
      async onQueryStarted(arg, api) {
        try {
          const { data: updatedUser } = await api.queryFulfilled;
          const userArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getUsers",
          );
          for (const ua of userArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getUsers", ua, (draft) => {
                const idx = draft.items.findIndex((u) => u.id === arg.id);
                if (idx !== -1) {
                  Object.assign(draft.items[idx], updatedUser);
                }
              }),
            );
          }
          api.dispatch(
            rbacApi.util.updateQueryData("getUser", arg.id, () => updatedUser),
          );
          await bumpRbacNextCache(["users-list", "users-options"]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(arg, api);
      },
    }),
    deleteUser: build.mutation<void, string>({
      query: (id) => ({ url: `users/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
        { type: "Role", id: "LIST" },
      ],
      async onQueryStarted(id, api) {
        try {
          await api.queryFulfilled;
          const userArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getUsers",
          );
          for (const ua of userArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getUsers", ua, (draft) => {
                patchPaginatedListById(draft, "remove", { id } as RbacUser);
              }),
            );
          }
          await bumpRbacNextCache([
            "users-list",
            "users-options",
            "roles-list",
            "roles-options",
          ]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(id, api);
      },
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
      ],
      async onQueryStarted({ userId }, api) {
        try {
          const { data: roles } = await api.queryFulfilled;
          const mapped = roles.map((r) => ({ id: r.id, name: r.name }));
          api.dispatch(
            rbacApi.util.updateQueryData("getUser", userId, (draft) => {
              const ud = draft as unknown as RbacUser & {
                roles?: RbacUserRoleSummary[];
              };
              ud.roles = mapped;
            }),
          );
          const userArgs = rbacApi.util.selectCachedArgsForQuery(
            api.getState(),
            "getUsers",
          );
          for (const ua of userArgs) {
            api.dispatch(
              rbacApi.util.updateQueryData("getUsers", ua, (draft) => {
                const ud = draft as unknown as UserListMutable;
                const idx = ud.items.findIndex((u) => u.id === userId);
                if (idx === -1) return;
                ud.items = ud.items.map((u, i) =>
                  i === idx ? { ...u, roles: mapped } : u,
                );
              }),
            );
          }
          await bumpRbacNextCache([
            "users-list",
            "users-options",
            "roles-list",
            "roles-options",
          ]);
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation({ userId }, api);
      },
    }),
    setUserStatus: build.mutation<
      { success: boolean },
      { userId: string; banned: boolean }
    >({
      query: ({ userId, banned }) => ({
        url: `users/${userId}/status`,
        method: "PUT",
        body: { banned },
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<{ success: boolean }>(
          response,
          "setUserStatus",
        ),
      invalidatesTags: (_result, _error, { userId }) => [
        { type: "User", id: userId },
        { type: "User", id: "LIST" },
        { type: "Role", id: "LIST" },
      ],
      async onQueryStarted({ userId, banned }, api) {
        const patchResults = [
          ...rbacApi.util
            .selectCachedArgsForQuery(api.getState(), "getUsers")
            .map((args) =>
              api.dispatch(
                rbacApi.util.updateQueryData("getUsers", args, (draft) => {
                  const user = draft.items.find((item) => item.id === userId);
                  if (user) {
                    (user as RbacUser & { bannedAt?: string | null }).bannedAt =
                      banned ? new Date().toISOString() : null;
                  }
                }),
              ),
            ),
          api.dispatch(
            rbacApi.util.updateQueryData("getUser", userId, (draft) => {
              (draft as RbacUser & { bannedAt?: string | null }).bannedAt =
                banned ? new Date().toISOString() : null;
            }),
          ),
        ];

        try {
          await api.queryFulfilled;
          await applyMutationCacheEffects(api.dispatch, {
            invalidate: [
              { type: "User", id: userId },
              { type: "User", id: "LIST" },
              { type: "Role", id: "LIST" },
              { type: "AuditEvent", id: "LIST" },
            ],
            revalidate: [
              "users-list",
              "users-options",
              "roles-list",
              "roles-options",
              "audit",
            ],
          });
        } catch {
          for (const patch of patchResults) {
            patch.undo();
          }
        }
        await refreshAuthAfterMutation({ userId, banned }, api);
      },
    }),
    resetUserPassword: build.mutation<{ password: string }, string>({
      query: (userId) => ({
        url: `users/${userId}/reset-password`,
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<{ password: string }>(
          response,
          "resetUserPassword",
        ),
      async onQueryStarted(userId, api) {
        try {
          await api.queryFulfilled;
          await applyMutationCacheEffects(api.dispatch, {
            invalidate: [
              { type: "User", id: userId },
              { type: "User", id: "LIST" },
              { type: "AuditEvent", id: "LIST" },
            ],
            revalidate: ["users-list", "users-options", "audit"],
          });
        } catch {
          // mutation failed
        }
        await refreshAuthAfterMutation(userId, api);
      },
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleOptionsQuery,
  useGetRoleQuery,
  useGetRoleEditBootstrapQuery,
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
  useSetUserStatusMutation,
  useResetUserPasswordMutation,
} = rbacApi;
