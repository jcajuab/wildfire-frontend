import { describe, expect, test } from "vitest";
import { parseApiListResponse } from "./contracts";

describe("parseApiListResponse", () => {
  test("parses canonical meta list responses", () => {
    const payload = {
      data: [{ id: "1" }],
      meta: {
        total: 1,
        page: 2,
        per_page: 25,
        total_pages: 3,
      },
    };

    const result = parseApiListResponse<{ id: string }>(payload);
    expect(result.data).toEqual(payload.data);
    expect(result.meta).toEqual(payload.meta);
  });

  test("throws when meta is missing and no legacy paging exists", () => {
    expect(() =>
      parseApiListResponse<{ id: string }>({
        data: [{ id: "1" }],
      }),
    ).toThrow("API payload list response is missing meta.");
  });
});
