import type { BackendAuditEvent } from "@/lib/api/audit-api";
import { getResourceTypeLabel } from "@/lib/audit-resource-types";
import type { LogEntry } from "@/types/log";

function safeParseMetadata(
  metadataJson: string | null,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  if (metadataJson == null) return fallback;
  try {
    const parsed = JSON.parse(metadataJson) as unknown;
    if (parsed != null && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export interface MapAuditEventOptions {
  getActorName?: (actorId: string, actorType: string | null) => string;
  getActorAvatarUrl?: (
    actorId: string,
    actorType: string | null,
  ) => string | null;
}

const ACTION_LABELS: Readonly<Record<string, string>> = {
  "auth.session.login": "Signed in",
  "auth.session.logout": "Signed out",
  "auth.session.refresh": "Refreshed session",
  "auth.profile.update": "Updated profile",
  "auth.password.update": "Changed password",
  "auth.password.reset.request": "Requested password reset",
  "auth.password.reset.complete": "Completed password reset",
  "auth.avatar.update": "Updated profile picture",
  "auth.account.delete": "Deleted account",
  "content.content.create": "Uploaded content",
  "content.content.update": "Updated content",
  "content.content.delete": "Deleted content",
  "content.content.list": "Viewed content library",
  "content.content.get": "Viewed content details",
  "content.content.replace-file": "Replaced content file",
  "content.file.download": "Requested content download link",
  "playlists.playlist.create": "Created playlist",
  "playlists.playlist.update": "Updated playlist",
  "playlists.playlist.delete": "Deleted playlist",
  "playlists.playlist.list": "Viewed playlists",
  "playlists.playlist.get": "Viewed playlist details",
  "playlists.item.create": "Added playlist item",
  "playlists.item.update": "Updated playlist item",
  "playlists.item.reorder": "Reordered playlist item",
  "playlists.item.delete": "Removed playlist item",
  "schedules.schedule.create": "Created schedule",
  "schedules.schedule.update": "Updated schedule",
  "schedules.schedule.delete": "Deleted schedule",
  "schedules.schedule.list": "Viewed schedules",
  "schedules.schedule.get": "Viewed schedule details",
  "displays.display.register": "Registered display",
  "displays.display.list": "Viewed displays",
  "displays.display.get": "Viewed display details",
  "displays.display.update": "Updated display",
  "displays.display.refresh": "Refreshed display",
  "displays.schedule.read": "Display checked active schedule",
  "displays.manifest.read": "Display requested playback manifest",
  "displays.stream.token": "Issued display stream token",
  "displays.stream.read": "Read display stream",
  "displays.group.list": "Viewed display groups",
  "displays.group.create": "Created display group",
  "displays.group.update": "Updated display group",
  "displays.group.delete": "Deleted display group",
  "displays.group.set": "Updated display groups",
  "displays.pairing-code.create": "Created display pairing code",
  "settings.displayRuntime.read": "Viewed display runtime settings",
  "settings.displayRuntime.update": "Updated display runtime settings",
  "rbac.user.create": "Created user",
  "rbac.user.update": "Updated user",
  "rbac.user.delete": "Deleted user",
  "rbac.user.list": "Viewed users",
  "rbac.user.get": "Viewed user details",
  "rbac.userRole.list": "Viewed user role assignments",
  "rbac.userRole.set": "Updated user role assignments",
  "rbac.role.create": "Created role",
  "rbac.role.update": "Updated role",
  "rbac.role.delete": "Deleted role",
  "rbac.role.list": "Viewed roles",
  "rbac.role.get": "Viewed role details",
  "rbac.rolePermission.list": "Viewed role permissions",
  "rbac.rolePermission.set": "Updated role permissions",
  "rbac.roleUser.list": "Viewed role users",
  "rbac.policyHistory.list": "Viewed role deletion policy history",
  "rbac.permission.list": "Viewed permissions",
  "rbac.roleDeletion.request": "Requested role deletion",
  "rbac.roleDeletion.list": "Viewed role deletion requests",
  "rbac.roleDeletion.approve": "Approved role deletion request",
  "rbac.roleDeletion.reject": "Rejected role deletion request",
  "auth.invitation.create": "Created invitation",
  "auth.invitation.list": "Viewed invitations",
  "auth.invitation.resend": "Resent invitation",
  "auth.invitation.accept": "Accepted invitation",
  "audit.event.list": "Viewed audit logs",
  "audit.event.download": "Downloaded audit logs",
  "authz.permission.deny": "Denied by permission policy",
};

function toResourceLabel(resourceType: string | null): string {
  if (resourceType == null || resourceType.length === 0) {
    return "record";
  }
  return getResourceTypeLabel(resourceType);
}

function humanizeAuditAction(event: BackendAuditEvent): string {
  const mapped = ACTION_LABELS[event.action];
  if (mapped) {
    return mapped;
  }

  const [module, entity, operation] = event.action.split(".");
  if (module && entity && operation) {
    const resource = toResourceLabel(event.resourceType ?? entity);
    if (operation === "create") return `Created ${resource}`;
    if (operation === "update") return `Updated ${resource}`;
    if (operation === "delete") return `Deleted ${resource}`;
    if (operation === "get" || operation === "read")
      return `Viewed ${resource}`;
    if (operation === "list") return `Viewed ${resource} list`;
    if (operation === "set") return `Updated ${resource}`;
  }

  return `Performed ${event.action}`;
}

export function mapAuditEventToLogEntry(
  event: BackendAuditEvent,
  options?: MapAuditEventOptions,
): LogEntry {
  const actorId = event.actorId ?? "unknown";
  const actorType = event.actorType ?? "unknown";
  const authorName =
    event.actorName ??
    options?.getActorName?.(actorId, event.actorType) ??
    (actorType === "user" ? actorId : actorType);
  const rawMetadata = safeParseMetadata(event.metadataJson, {
    requestId: event.requestId,
    action: event.action,
    actorName: event.actorName,
    actorEmail: event.actorEmail,
    method: event.method,
    route: event.route,
    path: event.path,
    status: event.status,
    actorId: event.actorId,
    actorType: event.actorType,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
  });

  const metadata: Record<string, unknown> = {
    outcome: event.status >= 400 ? "Failed" : "Success",
    status: event.status,
    target: event.resourceType ?? "unknown",
    "request id": event.requestId ?? "—",
    channel: event.actorType ?? "unknown",
  };
  const policyVersion =
    typeof rawMetadata.rbacPolicyVersion === "string" ||
    typeof rawMetadata.rbacPolicyVersion === "number"
      ? String(rawMetadata.rbacPolicyVersion)
      : null;
  const targetCount =
    typeof rawMetadata.rbacTargetCount === "string" ||
    typeof rawMetadata.rbacTargetCount === "number"
      ? String(rawMetadata.rbacTargetCount)
      : null;
  if (policyVersion) {
    metadata["policy version"] = policyVersion;
  }
  if (targetCount) {
    metadata["targets changed"] = targetCount;
  }
  const deniedPermission =
    typeof rawMetadata.deniedPermission === "string"
      ? rawMetadata.deniedPermission
      : null;
  const denyErrorCode =
    typeof rawMetadata.denyErrorCode === "string"
      ? rawMetadata.denyErrorCode
      : null;
  const denyErrorType =
    typeof rawMetadata.denyErrorType === "string"
      ? rawMetadata.denyErrorType
      : null;
  if (deniedPermission) {
    metadata.permission = deniedPermission;
  }
  if (denyErrorCode) {
    metadata["error code"] = denyErrorCode;
  }
  if (denyErrorType) {
    metadata["error type"] = denyErrorType;
  }
  return {
    id: event.id,
    timestamp: event.occurredAt,
    authorId: actorId,
    authorName,
    authorAvatarUrl:
      options?.getActorAvatarUrl?.(actorId, event.actorType) ?? null,
    description: humanizeAuditAction(event),
    technicalDescription: `${event.action} (${event.method} ${
      event.route ?? event.path
    })`,
    metadata,
    rawMetadata,
  };
}
