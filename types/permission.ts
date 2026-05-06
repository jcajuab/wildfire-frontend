export type PermissionResource =
  | "content"
  | "playlists"
  | "schedules"
  | "displays"
  | "users"
  | "roles"
  | "audit"
  | "ai";

export type PermissionAction = "read" | "create" | "update" | "delete";

export type PermissionType =
  | `${Exclude<PermissionResource, "ai">}:${PermissionAction}`
  | "ai:access";
