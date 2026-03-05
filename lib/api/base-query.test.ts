import { afterEach, describe, expect, test } from "vitest";
import { getBaseUrl } from "@/lib/api/base-query";

describe("getBaseUrl", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalApiVersion = process.env.NEXT_PUBLIC_API_VERSION;

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }

    if (originalApiVersion === undefined) {
      delete process.env.NEXT_PUBLIC_API_VERSION;
    } else {
      process.env.NEXT_PUBLIC_API_VERSION = originalApiVersion;
    }
  });

  test("returns same-origin versioned API path when base URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_VERSION = "v1";

    expect(getBaseUrl()).toBe("/api/v1");
  });

  test("returns absolute versioned API URL when base URL is configured", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/";
    process.env.NEXT_PUBLIC_API_VERSION = "v2";

    expect(getBaseUrl()).toBe("https://api.example.com/api/v2");
  });
});
