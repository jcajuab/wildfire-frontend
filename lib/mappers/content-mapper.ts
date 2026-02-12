import type { BackendContent } from "@/lib/api/content-api";
import type { Content } from "@/types/content";

export function mapBackendContentToContent(item: BackendContent): Content {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    checksum: item.checksum,
    width: item.width,
    height: item.height,
    duration: item.duration,
    // Backend does not expose status yet; keep deterministic UI behavior.
    status: "DRAFT",
    createdAt: item.createdAt,
    createdBy: {
      id: item.createdBy.id,
      name: item.createdBy.name ?? "Unknown",
    },
  };
}
