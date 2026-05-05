import { render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { EditContentDialog } from "./content-page-dialogs";
import type { Content } from "@/types/content";

const richTextJson = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Lorem ipsum" }],
    },
  ],
});

const textContent: Content = {
  id: "content-1",
  title: "Lorem Ipsum",
  type: "TEXT",
  thumbnailUrl: undefined,
  mimeType: "text/html",
  fileSize: 845,
  checksum: "checksum",
  width: null,
  height: null,
  duration: null,
  flashMessage: null,
  flashTone: null,
  textJsonContent: richTextJson,
  textHtmlContent: "<p>Lorem ipsum</p>",
  status: "READY",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  owner: {
    id: "user-1",
    username: "admin",
    name: "Admin",
  },
};

describe("EditContentDialog", () => {
  beforeAll(() => {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = () => {};
    }
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  test("matches the expanded text content modal layout", async () => {
    render(
      <EditContentDialog
        open
        content={textContent}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Edit Content");
    expect(dialog).toHaveClass("sm:max-w-4xl");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toHaveClass("overflow-hidden");

    expect(
      screen.getByText("Update formatted text content for display playback."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Text Content Title")).toBeInTheDocument();
    expect(screen.getByText("Text Content Body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

    expect(await screen.findByText("11 / 1000 characters")).toBeInTheDocument();
    expect(screen.queryByText(/words/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(document.querySelector(".ProseMirror")).toBeInTheDocument();
    });
    const editor = document.querySelector(".ProseMirror");
    expect(editor).toHaveClass("min-h-[280px]");
    expect(editor).toHaveClass("max-h-[min(46vh,420px)]");
    expect(editor).toHaveClass("overflow-y-auto");
    expect(editor).toHaveClass("overflow-x-hidden");
    expect(editor).toHaveClass("[overflow-wrap:anywhere]");
  });
});
