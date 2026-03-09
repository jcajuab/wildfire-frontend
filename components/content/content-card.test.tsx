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
  status: "READY",
  createdAt: "2024-01-01T00:00:00.000Z",
  createdBy: {
    id: "user-1",
    name: "Demo User",
  },
};

describe("ContentCard", () => {
  test(
    "does not show manage pages action for root PDFs",
    async () => {
      const user = userEvent.setup();
      render(<ContentCard content={baseContent} onPreview={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: /actions for/i }));

      expect(
        screen.queryByRole("menuitem", { name: "Manage Pages" }),
      ).not.toBeInTheDocument();
    },
    15_000,
  );

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
});
