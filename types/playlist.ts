export type PlaylistStatus = "DRAFT" | "IN_USE";

interface PlaylistOwner {
  readonly id: string;
  readonly name: string;
}

export interface PlaylistItemContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "TEXT";
  readonly checksum: string;
  readonly thumbnailUrl?: string | null;
  readonly textHtmlContent?: string | null;
}

export interface PlaylistItem {
  readonly id: string;
  readonly content: PlaylistItemContent;
  readonly duration: number;
  readonly sequence: number;
}

export interface PlaylistBase {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: PlaylistStatus;
  readonly itemsCount: number;
  readonly totalDuration: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: PlaylistOwner;
}

export interface PlaylistSummary extends PlaylistBase {
  readonly previewItems: readonly PlaylistItem[];
}

export interface PlaylistDetail extends PlaylistBase {
  readonly items: readonly PlaylistItem[];
}

type PlaylistContentType = "IMAGE" | "VIDEO" | "TEXT";

export function isPlaylistContentType(
  type: string,
): type is PlaylistContentType {
  return type === "IMAGE" || type === "VIDEO" || type === "TEXT";
}
