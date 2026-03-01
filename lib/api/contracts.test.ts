import { describe, expect, test } from "vitest";
import {
  parseApiListResponse,
  parseApiResponse,
  parseApiResponseData,
} from "./contracts";

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

describe("parseApiResponse", () => {
  test("throws descriptive error for non-object payload", () => {
    expect(() => parseApiResponse<string>("OK")).toThrow(
      "API payload is not a JSON object: received string.",
    );
  });

  test("parseApiResponseData throws for non-object payload", () => {
    expect(() => parseApiResponseData<string>(123)).toThrow(
      "API payload is not a JSON object: received number.",
    );
  });

  test("surfaces non-JSON marker details from API client parsing", () => {
    expect(() =>
      parseApiResponse<string>({
        __parseFailure: true,
        message: "Response body is not valid JSON",
        status: 500,
        statusText: "Internal Server Error",
        contentType: "text/plain",
        bodyPreview: "<html><body>oops</body></html>",
        url: "/api/v1/schedules",
      }),
    ).toThrow("Response body is not valid JSON");
  });
});
