import { describe, expect, test } from "vitest";
import {
  CLIENT_TRANSPORT_ERROR_MESSAGE,
  getApiErrorMessage,
  sanitizeTechnicalTransportMessage,
} from "@/lib/api/get-api-error-message";

describe("sanitizeTechnicalTransportMessage", () => {
  test("replaces HTML JSON parse errors with a generic transport message", () => {
    expect(
      sanitizeTechnicalTransportMessage(
        `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
      ),
    ).toBe(CLIENT_TRANSPORT_ERROR_MESSAGE);
  });

  test("replaces non-JSON API body messages", () => {
    expect(
      sanitizeTechnicalTransportMessage(
        "Response body is not valid JSON (status 502, content-type text/html).",
      ),
    ).toBe(CLIENT_TRANSPORT_ERROR_MESSAGE);
  });

  test("preserves normal backend messages", () => {
    expect(sanitizeTechnicalTransportMessage("Display name is required.")).toBe(
      "Display name is required.",
    );
  });
});

describe("getApiErrorMessage", () => {
  test("maps RTK Query PARSING_ERROR (HTML body) to a transport message", () => {
    const err = {
      status: "PARSING_ERROR",
      originalStatus: 200,
      data: "<!DOCTYPE html><html></html>",
      error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
    };
    expect(getApiErrorMessage(err, "Something went wrong.")).toBe(
      CLIENT_TRANSPORT_ERROR_MESSAGE,
    );
  });

  test("maps RTK Query FETCH_ERROR to a transport message", () => {
    const err = {
      status: "FETCH_ERROR",
      error: "TypeError: Failed to fetch",
    };
    expect(getApiErrorMessage(err, "Fallback.")).toBe(
      CLIENT_TRANSPORT_ERROR_MESSAGE,
    );
  });

  test("maps raw SyntaxError instances from JSON parsing", () => {
    const err = new SyntaxError(
      `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
    );
    expect(getApiErrorMessage(err, "Fallback.")).toBe(
      CLIENT_TRANSPORT_ERROR_MESSAGE,
    );
  });

  test("still prefers real API error envelopes when present", () => {
    const err = {
      status: 422,
      data: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Name is too long.",
          requestId: "req_1",
        },
      },
    };
    expect(getApiErrorMessage(err, "Fallback.")).toBe("Name is too long.");
  });
});
