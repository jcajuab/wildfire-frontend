import type { SortDirection } from "@/types/common";
export type { SortDirection };

export type PlaylistStatus = "DRAFT" | "IN_USE";

export interface PlaylistCreator {
  readonly id: string;
  readonly name: string;
}

export interface PlaylistItemContent {
  readonly id: string;
  readonly title: string;
  readonly type: "IMAGE" | "VIDEO" | "PDF";
  readonly checksum: string;
}

export interface PlaylistItem {
  readonly id: string;
  readonly content: PlaylistItemContent;
  readonly duration: number; // Duration in seconds to display this content
  readonly order: number;
}

export interface Playlist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: PlaylistStatus;
  readonly itemsCount: number;
  readonly items: readonly PlaylistItem[];
  readonly totalDuration: number; // Total duration in seconds
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdBy: PlaylistCreator;
}

export interface PlaylistListResponse {
  readonly items: readonly Playlist[];
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
