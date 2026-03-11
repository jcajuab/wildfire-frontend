import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ContentCard } from "@/components/content/content-card";
import type { Content } from "@/types/content";

const baseContent: Content = {
  id: "content-1",
  title: "Demo PDF",
  type: "PDF",
  kind: "ROOT",
  mimeType: "application/pdf",
  fileSize: 123,
  checksum: "checksum",
  parentContentId: null,
  pageNumber: null,
  pageCount: null,
  isExcluded: false,
  width: null,
  height: null,
  duration: null,
  scrollPxPerSecond: null,
  flashMessage: null,
  flashTone: null,
  textJsonContent: null,
  textHtmlContent: null,
  status: "READY",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  owner: {
    id: "user-1",
    name: "Demo User",
  },
};

describe("ContentCard", () => {
  test("does not show manage pages action for root PDFs", async () => {
    const user = userEvent.setup();
    render(<ContentCard content={baseContent} onPreview={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    expect(
      screen.queryByRole("menuitem", { name: "Manage Pages" }),
    ).not.toBeInTheDocument();
  }, 15_000);

  test("toggles pdf root expansion from card interaction", async () => {
    const user = userEvent.setup();
    const onTogglePdfRootExpand = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onPreview={vi.fn()}
        isPdfRootExpandable
        isPdfRootExpanded={false}
        onTogglePdfRootExpand={onTogglePdfRootExpand}
      />,
    );

    const toggleButton = screen.getByRole("button", {
      name: `Expand pages for ${baseContent.title}`,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    await user.click(toggleButton);
    expect(onTogglePdfRootExpand).toHaveBeenCalledWith(baseContent);
  });

  test("does not toggle expansion when opening card actions menu", async () => {
    const user = userEvent.setup();
    const onTogglePdfRootExpand = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onPreview={vi.fn()}
        isPdfRootExpandable
        isPdfRootExpanded={false}
        onTogglePdfRootExpand={onTogglePdfRootExpand}
      />,
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));
    expect(onTogglePdfRootExpand).not.toHaveBeenCalled();
  });

  test("renders flash message text preview and ignores thumbnail image", () => {
    const longFlashMessage =
      "This is a very long ticker message that should switch to the smallest responsive thumbnail typography tier automatically.";
    const flashContent: Content = {
      ...baseContent,
      id: "content-flash-1",
      title: "Ticker title fallback",
      type: "FLASH",
      mimeType: "text/plain",
      thumbnailUrl: "https://cdn.example.com/flash-thumb.jpg",
      flashMessage: longFlashMessage,
    };

    render(<ContentCard content={flashContent} onPreview={vi.fn()} />);

    const flashPreview = screen.getByText(longFlashMessage);
    expect(flashPreview).toHaveClass("text-xs", "leading-snug");
    expect(
      screen.queryByAltText(`${flashContent.title} preview`),
    ).not.toBeInTheDocument();
  });

  test("renders text content as plain text extracted from HTML", () => {
    const textContent: Content = {
      ...baseContent,
      id: "content-text-1",
      title: "Announcement title fallback",
      type: "TEXT",
      mimeType: "text/html",
      thumbnailUrl: "https://cdn.example.com/text-thumb.jpg",
      textHtmlContent:
        "<p>Hello <strong>world</strong> &amp; team</p><p></p><p>Second line</p>",
    };

    render(<ContentCard content={textContent} onPreview={vi.fn()} />);

    const previewText = screen.getByText((_, element) =>
      element?.classList.contains("whitespace-pre-wrap")
        ? element.textContent === "Hello world & team\n\nSecond line"
        : false,
    );
    expect(previewText).toHaveClass(
      "whitespace-pre-wrap",
      "break-words",
      "text-center",
    );
    expect(
      screen.queryByAltText(`${textContent.title} preview`),
    ).not.toBeInTheDocument();
  });

  test("falls back to content title when rich text content has no text", () => {
    const textContent: Content = {
      ...baseContent,
      id: "content-text-2",
      title: "Announcement fallback title",
      type: "TEXT",
      mimeType: "text/html",
      textHtmlContent: "<p><br/></p>",
    };

    render(<ContentCard content={textContent} onPreview={vi.fn()} />);

    const titleMatches = screen.getAllByText("Announcement fallback title");
    expect(titleMatches.length).toBeGreaterThan(1);
    expect(
      titleMatches.some((element) =>
        element.classList.contains("whitespace-pre-wrap"),
      ),
    ).toBe(true);
  });
});
