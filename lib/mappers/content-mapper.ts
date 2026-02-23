import type { BackendContent } from "@/lib/api/content-api";
import type { Content } from "@/types/content";

export function mapBackendContentToContent(item: BackendContent): Content {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    thumbnailUrl: item.thumbnailUrl,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    checksum: item.checksum,
    width: item.width,
    height: item.height,
    duration: item.duration,
    status: item.status,
    createdAt: item.createdAt,
    createdBy: {
      id: item.createdBy.id,
      name: item.createdBy.name ?? "Unknown",
    },
  };
}
