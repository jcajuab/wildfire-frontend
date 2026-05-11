import { describe, expect, test } from "vitest";
import {
  type BackendContentListItem,
  type BackendContentListResponse,
  type ContentListQuery,
  upsertContentIntoListDraft,
} from "@/lib/api/content-api";

const owner = {
  id: "user-1",
  username: "admin",
  name: "Admin",
};

function contentItem(
  overrides: Partial<BackendContentListItem> = {},
): BackendContentListItem {
  return {
    id: "content-1",
    title: "Content item",
    type: "IMAGE",
    status: "READY",
    thumbnailUrl: undefined,
    mimeType: "image/png",
    fileSize: 1024,
    checksum: "checksum-1",
    width: 100,
    height: 100,
    duration: null,
    flashMessage: null,
    flashTone: null,
    textHtmlContent: null,
    textPreviewText: null,
    isUsedInPlaylist: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    owner,
    ...overrides,
  };
}

function listResponse(
  items: BackendContentListItem[],
  overrides: Partial<BackendContentListResponse> = {},
): BackendContentListResponse {
  return {
    items,
    page: 1,
    pageSize: 2,
    total: items.length,
    ...overrides,
  };
}

describe("content cache patches", () => {
  const newestFirstQuery: ContentListQuery = {
    page: 1,
    pageSize: 2,
    sortBy: "createdAt",
    sortDirection: "desc",
  };

  test("inserts matching created content at the start of the newest first page", () => {
    const existing = contentItem({ id: "content-old", title: "Old content" });
    const created = contentItem({ id: "content-new", title: "New content" });
    const draft = listResponse([existing]);

    upsertContentIntoListDraft(draft, newestFirstQuery, created);

    expect(draft.items.map((item) => item.id)).toEqual([
      "content-new",
      "content-old",
    ]);
    expect(draft.total).toBe(2);
  });

  test("does not duplicate an existing content row", () => {
    const existing = contentItem({ title: "Original title" });
    const updated = contentItem({ title: "Updated title" });
    const draft = listResponse([existing]);

    upsertContentIntoListDraft(draft, newestFirstQuery, updated);

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]?.title).toBe("Updated title");
    expect(draft.total).toBe(1);
  });

  test("removes an existing row when it no longer matches a filtered list", () => {
    const existing = contentItem({ type: "IMAGE" });
    const updated = contentItem({ type: "VIDEO" });
    const draft = listResponse([existing]);

    upsertContentIntoListDraft(
      draft,
      { ...newestFirstQuery, type: "IMAGE" },
      updated,
    );

    expect(draft.items).toHaveLength(0);
    expect(draft.total).toBe(0);
  });

  test("updates totals without inserting into non-first pages", () => {
    const existing = contentItem({ id: "content-old" });
    const created = contentItem({ id: "content-new" });
    const draft = listResponse([existing], { page: 2, total: 3 });

    upsertContentIntoListDraft(
      draft,
      { ...newestFirstQuery, page: 2 },
      created,
    );

    expect(draft.items.map((item) => item.id)).toEqual(["content-old"]);
    expect(draft.total).toBe(4);
  });
});
