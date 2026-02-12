import type { BackendAuditEvent } from "@/lib/api/audit-api";
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

export function mapAuditEventToLogEntry(event: BackendAuditEvent): LogEntry {
  const actorId = event.actorId ?? "unknown";
  const actorType = event.actorType ?? "unknown";
  return {
    id: event.id,
    timestamp: event.occurredAt,
    authorId: actorId,
    authorName: actorType === "user" ? actorId : actorType,
    description: `${event.action} (${event.method} ${event.route ?? event.path})`,
    metadata: safeParseMetadata(event.metadataJson, {
      requestId: event.requestId,
      status: event.status,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    }),
  };
}
