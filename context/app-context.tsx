"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { User, UserRole } from "@/types/user";
import type { Role, Permission, RoleUser } from "@/types/role";

// Mock Data
const mockPermissions: Permission[] = [
  {
    id: "displays.view",
    name: "View Displays",
    description: "Can view all displays and their status",
  },
  {
    id: "displays.manage",
    name: "Manage Displays",
    description: "Can add, edit, and remove displays",
  },
  {
    id: "displays.control",
    name: "Control Displays",
    description: "Can control display power and refresh",
  },
  {
    id: "content.view",
    name: "View Content",
    description: "Can view all content items",
  },
  {
    id: "content.manage",
    name: "Manage Content",
    description: "Can upload, edit, and delete content",
  },
  {
    id: "playlists.view",
    name: "View Playlists",
    description: "Can view all playlists",
  },
  {
    id: "playlists.manage",
    name: "Manage Playlists",
    description: "Can create, edit, and delete playlists",
  },
  {
    id: "schedules.view",
    name: "View Schedules",
    description: "Can view all schedules",
  },
  {
    id: "schedules.manage",
    name: "Manage Schedules",
    description: "Can create, edit, and delete schedules",
  },
  {
    id: "users.view",
    name: "View Users",
    description: "Can view all users in the organization",
  },
  {
    id: "users.manage",
    name: "Manage Users",
    description: "Can invite, edit, and remove users",
  },
  {
    id: "roles.view",
    name: "View Roles",
    description: "Can view all roles and permissions",
  },
  {
    id: "roles.manage",
    name: "Manage Roles",
    description: "Can create, edit, and delete roles",
  },
];

const initialUsers: User[] = [
  {
    id: "1",
    name: "Admin",
    email: "john.doe@example.com",
    roles: [{ id: "1", name: "Admin" }],
    lastSeenAt: "2023-04-15T08:43:31Z",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    roles: [{ id: "2", name: "Editor" }],
    lastSeenAt: "2023-04-16T09:00:00Z",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    roles: [{ id: "3", name: "Viewer" }],
    lastSeenAt: "2023-04-16T10:00:00Z",
  },
];

const initialRoles: Role[] = [
  {
    id: "1",
    name: "Admin",
    permissions: mockPermissions,
    users: [
      { id: "1", name: "Admin", email: "john.doe@example.com" },
    ],
    usersCount: 1,
  },
  {
    id: "2",
    name: "Editor",
    permissions: mockPermissions.filter((p) => p.id.includes("manage")),
    users: [
      { id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
    ],
    usersCount: 1,
  },
  {
    id: "3",
    name: "Viewer",
    permissions: mockPermissions.filter((p) => p.id.includes("view")),
    users: [
      { id: "3", name: "Bob Johnson", email: "bob.johnson@example.com" },
    ],
    usersCount: 1,
  },
];

interface AppContextType {
  users: User[];
  roles: Role[];
  permissions: Permission[];
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  removeUser: (id: string) => void;
  addRole: (role: Role) => void;
  updateRole: (role: Role) => void;
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

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev]);
    // Also need to update roles if user has roles?
    // For simplicity, we'll assume new users might have roles, so we update roles
    if (user.roles.length > 0) {
      setRoles((prevRoles) =>
        prevRoles.map((role) => {
          if (user.roles.some((r) => r.id === role.id)) {
            return {
              ...role,
              users: [
                ...role.users,
                { id: user.id, name: user.name, email: user.email },
              ],
              usersCount: role.usersCount + 1,
            };
          }
          return role;
        }),
      );
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );

    // Sync roles
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        // Check if user should be in this role
        const shouldHaveRole = updatedUser.roles.some((r) => r.id === role.id);
        const hasRole = role.users.some((u) => u.id === updatedUser.id);

        if (shouldHaveRole && !hasRole) {
          // Add user to role
          return {
            ...role,
            users: [
              ...role.users,
              {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
              },
            ],
            usersCount: role.usersCount + 1,
          };
        } else if (!shouldHaveRole && hasRole) {
          // Remove user from role
          return {
            ...role,
            users: role.users.filter((u) => u.id !== updatedUser.id),
            usersCount: role.usersCount - 1,
          };
        }
        return role;
      }),
    );
  }, []);

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    // Remove from roles
    setRoles((prevRoles) =>
      prevRoles.map((role) => ({
        ...role,
        users: role.users.filter((u) => u.id !== id),
        usersCount: role.users.filter((u) => u.id !== id).length,
      })),
    );
  }, []);

  const addRole = useCallback((role: Role) => {
    setRoles((prev) => [...prev, role]);
    // If role has users assigned (unlikely on create, but possible), sync users
    if (role.users.length > 0) {
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (role.users.some((u) => u.id === user.id)) {
            return {
              ...user,
              roles: [...user.roles, { id: role.id, name: role.name }],
            };
          }
          return user;
        }),
      );
    }
  }, []);

  const updateRole = useCallback((updatedRole: Role) => {
    setRoles((prev) =>
      prev.map((role) => (role.id === updatedRole.id ? updatedRole : role)),
    );

    // Sync Users: Update role name in users' roles list, and add/remove role from user
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        const isAssigned = updatedRole.users.some((u) => u.id === user.id);
        const hasRole = user.roles.some((r) => r.id === updatedRole.id);

        let newRoles = user.roles;

        if (isAssigned && !hasRole) {
          // Add role
          newRoles = [...newRoles, { id: updatedRole.id, name: updatedRole.name }];
        } else if (!isAssigned && hasRole) {
          // Remove role
          newRoles = newRoles.filter((r) => r.id !== updatedRole.id);
        } else if (hasRole) {
          // Update role name
          newRoles = newRoles.map((r) =>
            r.id === updatedRole.id ? { ...r, name: updatedRole.name } : r,
          );
        }

        return { ...user, roles: newRoles };
      }),
    );
  }, []);

  const removeRole = useCallback((id: string) => {
    setRoles((prev) => prev.filter((r) => r.id !== id));
    // Remove role from users
    setUsers((prevUsers) =>
      prevUsers.map((user) => ({
        ...user,
        roles: user.roles.filter((r) => r.id !== id),
      })),
    );
  }, []);

  const value = useMemo(
    () => ({
      users,
      roles,
      permissions: mockPermissions,
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
      addUser,
      updateUser,
      removeUser,
      addRole,
      updateRole,
      removeRole,
    ],
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
