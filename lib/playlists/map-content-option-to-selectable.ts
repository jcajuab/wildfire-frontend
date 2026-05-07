import type { ContentOption } from "@/lib/api/content-api";
import type { PlaylistSelectableContent } from "@/components/playlists/create-playlist-form";
import { isPlaylistContentType } from "@/types/playlist";

const OPTIONS_PICKER_CONTENT_REST = {
  mimeType: "application/octet-stream",
  fileSize: 0,
  checksum: "",
  width: null,
  height: null,
  duration: null,
  flashMessage: null,
  flashTone: null,
  textJsonContent: null,
  textHtmlContent: null,
  status: "READY" as const,
  createdAt: "",
  updatedAt: "",
  owner: { id: "", name: "Unknown" },
} as const;

/** Maps lightweight options to grid/picker rows (full `Content` fields are unknown). */
export function mapContentOptionToPlaylistSelectable(
  opt: ContentOption,
): PlaylistSelectableContent | null {
  if (!isPlaylistContentType(opt.type)) return null;
  return {
    id: opt.id,
    title: opt.title,
    type: opt.type,
    ...OPTIONS_PICKER_CONTENT_REST,
    thumbnailUrl: opt.thumbnailUrl ?? undefined,
    textPreviewText: opt.textPreviewText ?? null,
  };
}
