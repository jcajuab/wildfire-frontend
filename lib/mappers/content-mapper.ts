import type {
  BackendContent,
  BackendContentListItem,
} from "@/lib/api/content-api";
import type { Content } from "@/types/content";

export function mapBackendContentToContent(
  item: BackendContent | BackendContentListItem,
): Content {
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
    textJsonContent: "textJsonContent" in item ? item.textJsonContent : null,
    textHtmlContent: "textHtmlContent" in item ? item.textHtmlContent : null,
    textPreviewText: item.textPreviewText ?? null,
    status: item.status,
    isUsedInPlaylist: item.isUsedInPlaylist,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    owner: {
      id: item.owner.id,
      username: item.owner.username,
      name: item.owner.name ?? "Unknown",
    },
  };
}
