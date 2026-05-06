export type PermissionResource =
  | "admin"
  | "content"
  | "playlists"
  | "schedules"
  | "displays"
  | "users"
  | "roles"
  | "audit"
  | "ai";

export type PermissionAction =
  | "access"
  | "read"
  | "create"
  | "update"
  | "delete";

export type PermissionType =
  | `${Exclude<PermissionResource, "admin" | "ai">}:${Exclude<PermissionAction, "access">}`
  | "admin:access"
  | "ai:access";
