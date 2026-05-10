import type { BackendContentListItem } from "@/lib/api/content-api";
import type { PlaylistSelectableContent } from "@/components/playlists/create-playlist-form";
import { isPlaylistContentType } from "@/types/playlist";
import { mapBackendContentToContent } from "@/lib/mappers/content-mapper";

export function mapContentListItemToPlaylistSelectable(
  item: BackendContentListItem,
): PlaylistSelectableContent | null {
  if (!isPlaylistContentType(item.type)) return null;
  return mapBackendContentToContent(item) as PlaylistSelectableContent;
}
