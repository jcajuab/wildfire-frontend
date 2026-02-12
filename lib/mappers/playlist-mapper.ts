import type {
  BackendPlaylist,
  BackendPlaylistItem,
  BackendPlaylistWithItems,
} from "@/lib/api/playlists-api";
import type { Content } from "@/types/content";
import type { Playlist, PlaylistItem } from "@/types/playlist";

function mapBackendPlaylistItemToContent(item: BackendPlaylistItem): Content {
  return {
    id: item.content.id,
    title: item.content.title,
    type: item.content.type,
    mimeType: item.content.type === "PDF" ? "application/pdf" : "image/*",
    fileSize: 0,
    checksum: item.content.checksum,
    width: null,
    height: null,
    duration: null,
    status: "DRAFT",
    createdAt: "",
    createdBy: { id: "", name: "Unknown" },
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
    status: "DRAFT",
    items: [],
    totalDuration: 0,
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
