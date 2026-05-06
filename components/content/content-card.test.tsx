import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ContentCard } from "@/components/content/content-card";
import { getFlashBadgeClassName } from "@/lib/display-runtime/flash-ticker";
import { formatDateWithTime } from "@/lib/formatters";
import type { Content } from "@/types/content";

vi.mock("@/hooks/use-can-modify-resource", () => ({
  useCanModifyResource: vi.fn(() => true),
}));

afterEach(() => {
  vi.useRealTimers();
});

const baseContent: Content = {
  id: "content-1",
  title: "Demo Image",
  type: "IMAGE",
  mimeType: "image/png",
  fileSize: 123,
  checksum: "checksum",
  width: null,
  height: null,
  duration: null,
  flashMessage: null,
  flashTone: null,
  textJsonContent: null,
  textHtmlContent: null,
  status: "READY",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  owner: {
    id: "user-1",
    username: "demo",
    name: "Demo User",
  },
};

describe("ContentCard", () => {
  const expectClassTokens = (element: HTMLElement, className: string): void => {
    className
      .split(" ")
      .filter((token) => token.length > 0)
      .forEach((token) => {
        expect(element).toHaveClass(token);
      });
  };

  test("does not show removed details or manage pages actions", async () => {
    const user = userEvent.setup();
    render(
      <ContentCard content={baseContent} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /actions for/i }));

    expect(
      screen.queryByRole("menuitem", { name: "View Details" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Manage Pages" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-slot="dropdown-menu-separator"]'),
    ).toBeInTheDocument();
  }, 15_000);

  test("does not toggle expansion when opening card actions menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<ContentCard content={baseContent} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: /actions for/i }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  test("renders an accessible selection checkbox when selection is enabled", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Select Demo Image" }),
    );

    expect(onSelectionChange).toHaveBeenCalledWith(baseContent, true);
  });

  test("toggles selection from the whole card in selection mode", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select Demo Image" }));

    expect(onSelectionChange).toHaveBeenCalledWith(baseContent, true);
  });

  test("supports keyboard selection from the focused card", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    const card = screen.getByRole("button", { name: "Select Demo Image" });
    card.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onSelectionChange).toHaveBeenNthCalledWith(1, baseContent, true);
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, baseContent, true);
  });

  test("does not double-toggle when selecting from the checkbox", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", { name: "Select Demo Image" }),
    );

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(baseContent, true);
  });

  test("mutes unselected cards and keeps selected cards prominent in selection mode", () => {
    const { rerender } = render(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected={false}
        onSelectionChange={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", { name: "Select Demo Image" });
    expect(card).toHaveAttribute("data-selection-muted", "true");
    expect(card).toHaveClass("opacity-55", "grayscale");

    rerender(
      <ContentCard
        content={baseContent}
        onDelete={vi.fn()}
        isSelected
        onSelectionChange={vi.fn()}
      />,
    );

    expect(card).toHaveAttribute("data-state", "selected");
    expect(card).toHaveClass("data-[state=selected]:opacity-100");
  });

  test("does not render a selection checkbox by default", () => {
    render(<ContentCard content={baseContent} />);

    expect(
      screen.queryByRole("checkbox", { name: "Select Demo Image" }),
    ).not.toBeInTheDocument();
  });

  test("does not render an empty actions menu when no card actions are available", () => {
    render(<ContentCard content={baseContent} />);

    expect(
      screen.queryByRole("button", { name: "Actions for Demo Image" }),
    ).not.toBeInTheDocument();
  });

  test("shows metadata badges without a separator between status and content type", () => {
    render(<ContentCard content={baseContent} />);

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("123 B")).toBeInTheDocument();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  test("shows owner and relative created activity on one row", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T02:00:00.000Z"));

    render(<ContentCard content={baseContent} />);

    expect(screen.getByText("@demo")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        `Created by @demo. Created ${formatDateWithTime(baseContent.createdAt)}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Created at")).not.toBeInTheDocument();
    expect(screen.queryByText("Updated at")).not.toBeInTheDocument();
    expect(screen.queryByText("Updated")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  test("shows owner and relative updated activity on one row", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-02T02:30:00.000Z"));
    const updatedContent: Content = {
      ...baseContent,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:30:00.000Z",
    };

    render(<ContentCard content={updatedContent} />);

    expect(screen.getByText("@demo")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        `Created by @demo. Updated ${formatDateWithTime(updatedContent.updatedAt)}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Created at")).not.toBeInTheDocument();
    expect(screen.queryByText("Updated at")).not.toBeInTheDocument();
    expect(screen.queryByText("Created")).not.toBeInTheDocument();

    vi.useRealTimers();
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

      render(<ContentCard content={flashContent} />);

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

    render(<ContentCard content={flashContent} />);

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

    render(<ContentCard content={textContent} />);

    const styledParagraph = screen.getByText((_, element) =>
      element?.tagName === "P"
        ? element.textContent === "Hello world & team"
        : false,
    );
    expect(styledParagraph).toHaveStyle({ color: "#16a34a" });
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

    render(<ContentCard content={textContent} />);

    const titleMatches = screen.getAllByText("Announcement fallback title");
    expect(titleMatches.length).toBeGreaterThan(1);
    expect(titleMatches.some((element) => element.tagName === "P")).toBe(true);
  });
});
