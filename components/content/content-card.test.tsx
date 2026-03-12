import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { ContentCard } from "@/components/content/content-card";
import { getFlashBadgeClassName } from "@/lib/display-runtime/flash-ticker";
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
  const expectClassTokens = (
    element: HTMLElement,
    className: string,
  ): void => {
    className
      .split(" ")
      .filter((token) => token.length > 0)
      .forEach((token) => {
        expect(element).toHaveClass(token);
      });
  };

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

  test.each(["INFO", "WARNING", "CRITICAL"] as const)(
    "renders %s tone for flash ticker preview using runtime badge classes",
    (tone) => {
      const flashMessage = "Ticker tone test message";
      const flashContent: Content = {
        ...baseContent,
        id: `content-flash-${tone.toLowerCase()}`,
        title: "Ticker title fallback",
        type: "FLASH",
        mimeType: "text/plain",
        thumbnailUrl: "https://cdn.example.com/flash-thumb.jpg",
        flashMessage,
        flashTone: tone,
      };

      render(<ContentCard content={flashContent} onPreview={vi.fn()} />);

      const toneBadge = screen.getByText(tone);
      expectClassTokens(toneBadge, getFlashBadgeClassName(tone));
      expect(screen.getByText(flashMessage)).toBeInTheDocument();
      expect(
        screen.queryByAltText(`${flashContent.title} preview`),
      ).not.toBeInTheDocument();
    },
  );

  test("defaults flash tone to INFO and truncates long ticker message in preview", () => {
    const longFlashMessage =
      "This is a very long ticker message that should be truncated in the content card preview so that it stays on a single line.";
    const flashContent: Content = {
      ...baseContent,
      id: "content-flash-1",
      title: "Ticker title fallback",
      type: "FLASH",
      mimeType: "text/plain",
      thumbnailUrl: "https://cdn.example.com/flash-thumb.jpg",
      flashMessage: longFlashMessage,
      flashTone: null,
    };

    render(<ContentCard content={flashContent} onPreview={vi.fn()} />);

    const toneBadge = screen.getByText("INFO");
    expectClassTokens(toneBadge, getFlashBadgeClassName("INFO"));
    const flashPreview = screen.getByText(longFlashMessage);
    expect(flashPreview).toHaveClass("truncate");
    expect(
      screen.queryByAltText(`${flashContent.title} preview`),
    ).not.toBeInTheDocument();
  });

  test("renders text content with rich text formatting in thumbnail preview", () => {
    const textContent: Content = {
      ...baseContent,
      id: "content-text-1",
      title: "Announcement title fallback",
      type: "TEXT",
      mimeType: "text/html",
      thumbnailUrl: "https://cdn.example.com/text-thumb.jpg",
      textHtmlContent:
        '<p style="color:#16a34a">Hello <strong>world</strong> &amp; <em>team</em></p>',
    };

    render(<ContentCard content={textContent} onPreview={vi.fn()} />);

    const styledParagraph = screen.getByText((_, element) =>
      element?.tagName === "P" ? element.textContent === "Hello world & team" : false,
    );
    expect(styledParagraph).toHaveStyle({ color: "rgb(22, 163, 74)" });
    expect(styledParagraph.querySelector("strong")?.textContent).toBe("world");
    expect(styledParagraph.querySelector("em")?.textContent).toBe("team");
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
    expect(titleMatches.some((element) => element.tagName === "P")).toBe(true);
  });
});
