import type { SortDirection } from "@/types/common";
export type { SortDirection };

export type PlaylistStatus = "DRAFT" | "IN_USE";

export interface PlaylistOwner {
  readonly id: string;
  readonly name: string;
}

export interface PlaylistItemContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT";
  readonly checksum: string;
  readonly thumbnailUrl?: string | null;
}

export interface PlaylistItem {
  readonly id: string;
  readonly content: PlaylistItemContent;
  readonly duration: number;
  readonly order: number;
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

export type Playlist = PlaylistDetail;

export interface PlaylistListResponse {
  readonly items: readonly PlaylistSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export type PlaylistSortField = "recent" | "name";

export interface PlaylistFilter {
  readonly status?: PlaylistStatus;
  readonly search?: string;
  readonly sortBy?: PlaylistSortField;
  readonly sortDirection?: SortDirection;
}
