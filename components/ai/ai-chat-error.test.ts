import { describe, expect, test } from "vitest";

import { formatAIErrorMessage } from "@/components/ai/ai-chat";

describe("formatAIErrorMessage", () => {
  test("hides raw AI SDK stream validation details", () => {
    expect(
      formatAIErrorMessage(
        'Type validation failed: Value: {"type":"tool-output-available","output":{"success":true,"data":[{"textHtmlContent":"<p>raw</p>"}]}}',
      ),
    ).toBe("The AI response could not be displayed. Please try again.");
  });

  test("maps rate limits to a short retry message", () => {
    expect(formatAIErrorMessage("429 Too many requests")).toBe(
      "AI request limit reached. Please wait and try again.",
    );
  });

  test("maps tool errors to a short action failure message", () => {
    expect(formatAIErrorMessage("Invalid tool input")).toBe(
      "The AI assistant could not complete that action. Please adjust the request and try again.",
    );
  });
});
