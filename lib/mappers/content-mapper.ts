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
    flashMessage: item.flashMessage ?? null,
    flashTone: item.flashTone ?? null,
    textJsonContent: item.textJsonContent ?? null,
    textHtmlContent: item.textHtmlContent ?? null,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    owner: {
      id: item.owner.id,
      name: item.owner.name ?? "Unknown",
    },
  };
}
