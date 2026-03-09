import type { SortDirection } from "@/types/common";

export type { SortDirection };

export type ContentType = "IMAGE" | "VIDEO" | "PDF" | "FLASH";
export type ContentKind = "ROOT" | "PAGE";
export type FlashTone = "INFO" | "WARNING" | "CRITICAL";

export type ContentStatus = "PROCESSING" | "READY" | "FAILED";

export interface ContentOwner {
  readonly id: string;
  readonly name: string;
}

export interface Content {
  readonly id: string;
  readonly title: string;
  readonly type: ContentType;
  readonly kind: ContentKind;
  readonly thumbnailUrl?: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly checksum: string;
  readonly parentContentId: string | null;
  readonly pageNumber: number | null;
  readonly pageCount: number | null;
  readonly isExcluded: boolean;
  readonly width: number | null;
  readonly height: number | null;
  readonly duration: number | null;
  readonly scrollPxPerSecond: number | null;
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly status: ContentStatus;
  readonly createdAt: string;
  readonly owner: ContentOwner;
}

export interface ContentListResponse {
  readonly items: readonly Content[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export type ContentSortField =
  | "createdAt"
  | "title"
  | "fileSize"
  | "type"
  | "pageNumber";

export interface ContentFilter {
  readonly status?: ContentStatus;
  readonly type?: ContentType;
  readonly search?: string;
  readonly sortBy?: ContentSortField;
  readonly sortDirection?: SortDirection;
}
