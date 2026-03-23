import type {
  BackendPlaylistItem,
  BackendPlaylistSummary,
  BackendPlaylistWithItems,
} from "@/lib/api/playlists-api";
import type { Playlist, PlaylistItem, PlaylistSummary } from "@/types/playlist";

function mapBackendPlaylistItemToContent(
  item: BackendPlaylistItem,
): PlaylistItem["content"] {
  return {
    id: item.content.id,
    title: item.content.title,
    type: item.content.type,
    checksum: item.content.checksum,
    thumbnailUrl: item.content.thumbnailUrl ?? null,
    textHtmlContent: item.content.textHtmlContent ?? null,
  };
}

export function mapBackendPlaylistItem(
  item: BackendPlaylistItem,
): PlaylistItem {
  return {
    id: item.id,
    content: mapBackendPlaylistItemToContent(item),
    duration: item.duration,
    sequence: item.sequence,
  };
}

export function mapBackendPlaylistSummary(
  item: BackendPlaylistSummary,
): PlaylistSummary {
  const previewItems = [...(item.previewItems ?? [])]
    .sort((a, b) => a.sequence - b.sequence)
    .map(mapBackendPlaylistItem);

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    itemsCount: item.itemsCount,
    previewItems,
    totalDuration: item.totalDuration,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    owner: {
      id: item.owner.id,
      name: item.owner.name ?? "Unknown",
    },
  };
}

export function mapBackendPlaylistWithItems(
  item: BackendPlaylistWithItems,
): Playlist {
  const mappedItems = [...item.items]
    .sort((a, b) => a.sequence - b.sequence)
    .map(mapBackendPlaylistItem);
  const totalDuration = mappedItems.reduce((sum, x) => sum + x.duration, 0);

  return {
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    itemsCount: item.itemsCount,
    items: mappedItems,
    totalDuration,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    owner: {
      id: item.owner.id,
      name: item.owner.name ?? "Unknown",
    },
  };
}
