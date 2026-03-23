import type { SortDirection } from "@/types/common";

export type ContentType = "IMAGE" | "VIDEO" | "FLASH" | "TEXT";
export type FlashTone = "INFO" | "WARNING" | "CRITICAL";

export type ContentStatus = "PROCESSING" | "READY" | "FAILED";

export interface ContentOwner {
  readonly id: string;
  /** Display name of the owner. Coerced from null to "Unknown" in content-mapper.ts. */
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
  readonly flashMessage: string | null;
  readonly flashTone: FlashTone | null;
  readonly textJsonContent: string | null;
  readonly textHtmlContent: string | null;
  readonly status: ContentStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly owner: ContentOwner;
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
