"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User } from "@/types/user";
import type { Role, Permission } from "@/types/role";

/** Role detail (permission and user assignments) for dialog initial state. */
export interface RoleDetail {
  readonly permissionIds: string[];
  readonly userIds: string[];
}

// Mock permissions aligned with backend (resource:action); id = "resource:action"
const mockPermissions: Permission[] = [
  { id: "content:read", resource: "content", action: "read" },
  { id: "content:create", resource: "content", action: "create" },
  { id: "content:update", resource: "content", action: "update" },
  { id: "content:delete", resource: "content", action: "delete" },
  { id: "playlists:read", resource: "playlists", action: "read" },
  { id: "playlists:create", resource: "playlists", action: "create" },
  { id: "playlists:update", resource: "playlists", action: "update" },
  { id: "playlists:delete", resource: "playlists", action: "delete" },
  { id: "schedules:read", resource: "schedules", action: "read" },
  { id: "schedules:create", resource: "schedules", action: "create" },
  { id: "schedules:update", resource: "schedules", action: "update" },
  { id: "schedules:delete", resource: "schedules", action: "delete" },
  { id: "devices:read", resource: "devices", action: "read" },
  { id: "devices:create", resource: "devices", action: "create" },
  { id: "devices:update", resource: "devices", action: "update" },
  { id: "devices:delete", resource: "devices", action: "delete" },
  { id: "users:read", resource: "users", action: "read" },
  { id: "users:create", resource: "users", action: "create" },
  { id: "users:update", resource: "users", action: "update" },
  { id: "users:delete", resource: "users", action: "delete" },
  { id: "roles:read", resource: "roles", action: "read" },
  { id: "roles:create", resource: "roles", action: "create" },
  { id: "roles:update", resource: "roles", action: "update" },
  { id: "roles:delete", resource: "roles", action: "delete" },
];

const initialUsers: User[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    name: "Admin",
    isActive: true,
    roles: [{ id: "1", name: "Admin" }],
    lastSeenAt: "2023-04-15T08:43:31Z",
  },
  {
    id: "2",
    email: "jane.smith@example.com",
    name: "Jane Smith",
    isActive: true,
    roles: [{ id: "2", name: "Editor" }],
    lastSeenAt: "2023-04-16T09:00:00Z",
  },
  {
    id: "3",
    email: "bob.johnson@example.com",
    name: "Bob Johnson",
    isActive: true,
    roles: [{ id: "3", name: "Viewer" }],
    lastSeenAt: "2023-04-16T10:00:00Z",
  },
];

const initialRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    description: "Full access",
    isSystem: true,
    usersCount: 1,
  },
  {
    id: "2",
    name: "Editor",
    description: "Create and edit content",
    isSystem: false,
    usersCount: 1,
  },
  {
    id: "3",
    name: "Viewer",
    description: "Read-only access",
    isSystem: false,
    usersCount: 1,
  },
];

const initialRoleDetails: Record<string, RoleDetail> = {
  "1": {
    permissionIds: mockPermissions.map((p) => p.id),
    userIds: ["1"],
  },
  "2": {
    permissionIds: mockPermissions
      .filter(
        (p) =>
          p.action === "create" || p.action === "update" || p.action === "read"
      )
      .map((p) => p.id),
    userIds: ["2"],
  },
  "3": {
    permissionIds: mockPermissions
      .filter((p) => p.action === "read")
      .map((p) => p.id),
    userIds: ["3"],
  },
};

interface AppContextType {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  getRoleDetails: (roleId: string) => RoleDetail | undefined;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (id: string) => void;
  addRole: (role: Role, detail: RoleDetail) => void;
  updateRole: (role: Role, detail: RoleDetail) => void;
  removeRole: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [roleDetails, setRoleDetails] =
    useState<Record<string, RoleDetail>>(initialRoleDetails);

  const getRoleDetails = useCallback(
    (roleId: string): RoleDetail | undefined => {
      return roleDetails[roleId];
    },
    [roleDetails]
  );

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev]);
    const userRoles = user.roles ?? [];
    if (userRoles.length > 0) {
      setRoleDetails((prev) => {
        const next = { ...prev };
        for (const r of userRoles) {
          const current = next[r.id];
          next[r.id] = {
            permissionIds: current?.permissionIds ?? [],
            userIds: [...(current?.userIds ?? []), user.id],
          };
        }
        return next;
      });
      setRoles((prev) =>
        prev.map((role) =>
          userRoles.some((r) => r.id === role.id)
            ? { ...role, usersCount: (role.usersCount ?? 0) + 1 }
            : role
        )
      );
    }
  }, []);

  const updateUser = useCallback(
    (updatedUser: User) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );

      const prevUser = users.find((u) => u.id === updatedUser.id);
      const prevRoleIds = new Set((prevUser?.roles ?? []).map((r) => r.id));
      const nextRoleIds = new Set((updatedUser.roles ?? []).map((r) => r.id));

      setRoleDetails((prev) => {
        const next = { ...prev };
        for (const roleId of [...prevRoleIds, ...nextRoleIds]) {
          const current = next[roleId] ?? { permissionIds: [], userIds: [] };
          let userIds = current.userIds.filter((id) => id !== updatedUser.id);
          if (nextRoleIds.has(roleId)) {
            userIds = [...userIds, updatedUser.id];
          }
          next[roleId] = { permissionIds: current.permissionIds, userIds };
        }
        return next;
      });

      setRoles((prev) =>
        prev.map((role) => {
          const hadUser = prevRoleIds.has(role.id);
          const hasUser = nextRoleIds.has(role.id);
          const count =
            (role.usersCount ?? 0) + (hasUser ? 1 : 0) - (hadUser ? 1 : 0);
          return { ...role, usersCount: Math.max(0, count) };
        })
      );
    },
    [users]
  );

  const removeUser = useCallback(
    (id: string) => {
      const user = users.find((u) => u.id === id);
      const roleIds = (user?.roles ?? []).map((r) => r.id);

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setRoleDetails((prev) => {
        const next = { ...prev };
        for (const roleId of Object.keys(next)) {
          next[roleId] = {
            ...next[roleId],
            userIds: next[roleId].userIds.filter((uid) => uid !== id),
          };
        }
        return next;
      });
      setRoles((prev) =>
        prev.map((role) =>
          roleIds.includes(role.id)
            ? { ...role, usersCount: Math.max(0, (role.usersCount ?? 0) - 1) }
            : role
        )
      );
    },
    [users]
  );

  const addRole = useCallback((role: Role, detail: RoleDetail) => {
    setRoles((prev) => [
      ...prev,
      { ...role, usersCount: detail.userIds.length },
    ]);
    setRoleDetails((prev) => ({ ...prev, [role.id]: detail }));

    if (detail.userIds.length > 0) {
      setUsers((prev) =>
        prev.map((user) => {
          if (detail.userIds.includes(user.id)) {
            return {
              ...user,
              roles: [...(user.roles ?? []), { id: role.id, name: role.name }],
            };
          }
          return user;
        })
      );
    }
  }, []);

  const updateRole = useCallback(
    (role: Role, detail: RoleDetail) => {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === role.id ? { ...role, usersCount: detail.userIds.length } : r
        )
      );
      setRoleDetails((prev) => ({ ...prev, [role.id]: detail }));

      const prevDetail = roleDetails[role.id];
      const prevUserIds = new Set(prevDetail?.userIds ?? []);
      const nextUserIds = new Set(detail.userIds);

      setUsers((prev) =>
        prev.map((user) => {
          const hadRole = prevUserIds.has(user.id);
          const hasRole = nextUserIds.has(user.id);
          const rolesList = user.roles ?? [];
          if (hasRole && !hadRole) {
            return {
              ...user,
              roles: [
                ...rolesList.filter((r) => r.id !== role.id),
                { id: role.id, name: role.name },
              ],
            };
          }
          if (!hasRole && hadRole) {
            return {
              ...user,
              roles: rolesList.filter((r) => r.id !== role.id),
            };
          }
          if (hasRole && hadRole) {
            return {
              ...user,
              roles: rolesList.map((r) =>
                r.id === role.id ? { id: role.id, name: role.name } : r
              ),
            };
          }
          return user;
        })
      );
    },
    [roleDetails]
  );

  const removeRole = useCallback((id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    setRoleDetails((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setUsers((prev) =>
      prev.map((user) => ({
        ...user,
        roles: (user.roles ?? []).filter((r) => r.id !== id),
      }))
    );
  }, []);

  const value = useMemo(
    () => ({
      users,
      roles,
      permissions: mockPermissions,
      getRoleDetails,
      addUser,
      updateUser,
      removeUser,
      addRole,
      updateRole,
      removeRole,
    }),
    [
      users,
      roles,
      getRoleDetails,
      addUser,
      updateUser,
      removeUser,
      addRole,
      updateRole,
      removeRole,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
