export type PermissionResource =
  | "content"
  | "playlists"
  | "schedules"
  | "displays"
  | "users"
  | "roles"
  | "audit"
  | "settings";

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete";

export type PermissionType = `${PermissionResource}:${PermissionAction}`;
