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
  | "register"
  | "create"
  | "update"
  | "delete"
  | "download";

export type PermissionType = `${PermissionResource}:${PermissionAction}`;
