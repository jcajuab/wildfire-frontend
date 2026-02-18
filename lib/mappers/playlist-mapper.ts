import type {
  BackendPlaylist,
  BackendPlaylistItem,
  BackendPlaylistWithItems,
} from "@/lib/api/playlists-api";
import type { Playlist, PlaylistItem } from "@/types/playlist";

function mapBackendPlaylistItemToContent(
  item: BackendPlaylistItem,
): PlaylistItem["content"] {
  return {
    id: item.content.id,
    title: item.content.title,
    type: item.content.type,
    checksum: item.content.checksum,
  };
}

export function mapBackendPlaylistItem(
  item: BackendPlaylistItem,
): PlaylistItem {
  return {
    id: item.id,
    content: mapBackendPlaylistItemToContent(item),
    duration: item.duration,
    order: item.sequence,
  };
}

export function mapBackendPlaylistBase(item: BackendPlaylist): Playlist {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    status: item.status,
    itemsCount: item.itemsCount,
    items: [],
    totalDuration: item.totalDuration,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: {
      id: item.createdBy.id,
      name: item.createdBy.name ?? "Unknown",
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
    ...mapBackendPlaylistBase(item),
    items: mappedItems,
    totalDuration,
  };
}
