import DOMPurify from "dompurify";
import type { Content } from "@/types/content";

const HTML_ENTITY_MAP: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token) => {
    const normalized = token.toLowerCase();
    if (normalized in HTML_ENTITY_MAP) {
      return HTML_ENTITY_MAP[normalized] ?? entity;
    }

    if (normalized.startsWith("#x")) {
      const parsed = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
    }

    if (normalized.startsWith("#")) {
      const parsed = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
    }

    return entity;
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SAFE_RICH_TEXT_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "span",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
];

export function sanitizeRichTextHtml(html: string): string {
  if (html.trim().length === 0) {
    return "";
  }
  if (typeof window === "undefined") {
    return `<p>${escapeHtml(extractPlainTextFromHtml(html))}</p>`;
  }

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...SAFE_RICH_TEXT_TAGS],
    ALLOWED_ATTR: ["style", "colspan", "rowspan"],
  });
}

export function extractPlainTextFromHtml(html: string | null): string {
  if (html === null) {
    return "";
  }

  const compactHtml = html.replace(/>\s+</g, "><");
  const withParagraphBreaks = compactHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/(p|div|section|article|header|footer|li|ul|ol|h[1-6])>/gi,
      "\n",
    );

  const withoutTags = withParagraphBreaks.replace(/<[^>]*>/g, "");
  return decodeHtmlEntities(withoutTags)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getFlashThumbnailText(content: Content): string {
  const message = content.flashMessage?.trim() ?? "";
  return message.length > 0 ? message : content.title;
}

export function getTextThumbnailText(content: Content): string {
  const textContent = extractPlainTextFromHtml(content.textHtmlContent);
  return textContent.length > 0 ? textContent : content.title;
}

export function getTextThumbnailHtml(content: Content): string {
  const htmlContent = content.textHtmlContent ?? "";
  const sanitized = sanitizeRichTextHtml(htmlContent);
  if (extractPlainTextFromHtml(sanitized).length > 0) {
    return sanitized;
  }
  return `<p>${escapeHtml(content.title)}</p>`;
}

export function getFlashTypographyClass(messageLength: number): string {
  if (messageLength <= 32) {
    return "text-base leading-tight";
  }

  if (messageLength <= 80) {
    return "text-sm leading-snug";
  }

  return "text-xs leading-snug";
}
