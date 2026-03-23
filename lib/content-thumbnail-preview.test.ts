import { describe, expect, test } from "vitest";
import {
  extractPlainTextFromHtml,
  getFlashThumbnailText,
  getFlashTypographyClass,
  getTextThumbnailHtml,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import type { Content } from "@/types/content";

const baseContent: Content = {
  id: "content-preview-1",
  title: "Fallback title",
  type: "TEXT",
  thumbnailUrl: undefined,
  mimeType: "text/plain",
  fileSize: 0,
  checksum: "checksum",
  width: null,
  height: null,
  duration: null,
  flashMessage: null,
  flashTone: null,
  textJsonContent: null,
  textHtmlContent: null,
  status: "READY",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  owner: {
    id: "owner-1",
    name: "Owner",
  },
};

describe("extractPlainTextFromHtml", () => {
  test("returns empty string for null input", () => {
    expect(extractPlainTextFromHtml(null)).toBe("");
  });

  test("strips HTML tags, decodes entities, and collapses whitespace", () => {
    expect(
      extractPlainTextFromHtml(
        "<p>Hello <strong>world</strong> &amp; team&nbsp; &#33;</p>\n<p>Next line</p>",
      ),
    ).toBe("Hello world & team !\nNext line");
  });

  test("returns empty string for markup without text content", () => {
    expect(extractPlainTextFromHtml("<p><br/></p>")).toBe("");
  });

  test("preserves paragraph spacing for empty paragraphs", () => {
    expect(
      extractPlainTextFromHtml(
        "<p>First paragraph</p><p></p><p>Second paragraph</p>",
      ),
    ).toBe("First paragraph\n\nSecond paragraph");
  });
});

describe("thumbnail preview text helpers", () => {
  test("returns trimmed flash message verbatim", () => {
    expect(
      getFlashThumbnailText({
        ...baseContent,
        type: "FLASH",
        flashMessage: "   ticker message hello world   ",
      }),
    ).toBe("ticker message hello world");
  });

  test("falls back to title when rich text has no extracted text", () => {
    expect(
      getTextThumbnailText({
        ...baseContent,
        type: "TEXT",
        title: "Announcement title",
        textHtmlContent: "<p><br/></p>",
      }),
    ).toBe("Announcement title");
  });

  test("returns sanitized rich text html and preserves formatting", () => {
    expect(
      getTextThumbnailHtml({
        ...baseContent,
        textHtmlContent:
          '<p style="text-align:center;color:#0f172a">Hello <strong>world</strong> and <em>team</em></p><script>alert(1)</script>',
      }),
    ).toBe("<p>Hello <strong>world</strong> and <em>team</em></p>");
  });

  test("falls back to escaped title when rich text has no visible text", () => {
    expect(
      getTextThumbnailHtml({
        ...baseContent,
        title: "A <Title>",
        textHtmlContent: "<p><br/></p>",
      }),
    ).toBe("<p>A &lt;Title&gt;</p>");
  });
});

describe("getFlashTypographyClass", () => {
  test("returns large tier for short text", () => {
    expect(getFlashTypographyClass(32)).toBe("text-base leading-tight");
  });

  test("returns medium tier for mid-length text", () => {
    expect(getFlashTypographyClass(60)).toBe("text-sm leading-snug");
  });

  test("returns smallest tier for long text", () => {
    expect(getFlashTypographyClass(81)).toBe("text-xs leading-snug");
  });
});
