import type { SortDirection } from "@/types/common";

export type { SortDirection };

export type ContentType = "IMAGE" | "VIDEO" | "PDF";

export type ContentStatus = "DRAFT" | "IN_USE";

export interface ContentCreator {
  readonly id: string;
  readonly name: string;
}

export interface Content {
  readonly id: string;
  readonly title: string;
  readonly type: ContentType;
  readonly thumbnailUrl?: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration: number | null;
  readonly status: ContentStatus;
  readonly createdAt: string;
  readonly createdBy: ContentCreator;
}

export interface ContentListResponse {
  readonly items: readonly Content[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export type ContentSortField = "createdAt" | "title" | "fileSize" | "type";

export interface ContentFilter {
  readonly status?: ContentStatus;
  readonly type?: ContentType;
  readonly search?: string;
  readonly sortBy?: ContentSortField;
  readonly sortDirection?: SortDirection;
}
