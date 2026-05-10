import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { EditContentDialog } from "./content-page-dialogs";
import { SUPPORTED_CONTENT_FILE_LABELS } from "@/components/content/content-file-types";
import type { Content } from "@/types/content";

const oversizedFileBytes = 10 * 1024 * 1024 + 1;

const createFile = (name: string, type: string, size: number): File => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

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

const flashContent: Content = {
  ...textContent,
  id: "content-2",
  title: "Emergency Alert",
  type: "FLASH",
  mimeType: "text/plain",
  fileSize: 120,
  flashMessage: "Please proceed to the nearest exit.",
  flashTone: "WARNING",
  textJsonContent: null,
  textHtmlContent: null,
};

const imageContent: Content = {
  ...textContent,
  id: "content-3",
  title: "Lobby Poster",
  type: "IMAGE",
  mimeType: "image/jpeg",
  fileSize: 1024,
  textJsonContent: null,
  textHtmlContent: null,
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
    expect(screen.getByText("Text Content Message")).toBeInTheDocument();
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

  test("matches the expanded flash content modal layout", () => {
    render(
      <EditContentDialog
        open
        content={flashContent}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Edit Content");
    expect(dialog).toHaveClass("sm:max-w-2xl");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toHaveClass("overflow-hidden");

    expect(
      screen.getByText("Update the flash message used for display playback."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Flash Content Title")).toHaveAttribute(
      "placeholder",
      "Enter flash content title",
    );
    expect(screen.getByLabelText("Flash Content Message")).toHaveAttribute(
      "placeholder",
      "Enter the flash message to display",
    );
    expect(
      screen.getByRole("combobox", { name: "Flash Content Tone" }),
    ).toHaveClass("w-full");
    expect(
      screen.getAllByText("Please proceed to the nearest exit."),
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("matches the upload modal layout for uploaded content", () => {
    render(
      <EditContentDialog
        open
        content={imageContent}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Edit Content");
    expect(dialog).toHaveClass("sm:max-w-lg");

    expect(
      screen.getByText(
        "Update the content title or replace the uploaded file.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Content Title")).toBeInTheDocument();
    expect(screen.queryByText("Uploaded File")).not.toBeInTheDocument();
    expect(screen.queryByText(/Current file:/)).not.toBeInTheDocument();
    expect(screen.getByText(SUPPORTED_CONTENT_FILE_LABELS)).toBeInTheDocument();
    expect(screen.getByText("Max 10 MB")).toBeInTheDocument();

    const dropzone = screen
      .getByText("Choose a file")
      .closest(".border-dashed");
    expect(dropzone).toHaveClass("p-8", "gap-3");
    expect(dropzone?.querySelector(".size-12")).toBeInTheDocument();
    expect(dropzone?.querySelector(".size-6")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  test("rejects oversized replacement files before save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <EditContentDialog
        open
        content={imageContent}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.upload(
      screen.getByLabelText("Choose a file"),
      createFile("too-large.png", "image/png", oversizedFileBytes),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "File must be 10 MB or smaller.",
    );
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  test("clears replacement file errors after selecting a valid file", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <EditContentDialog
        open
        content={imageContent}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByLabelText("Choose a file");
    await user.upload(
      input,
      createFile("too-large.png", "image/png", oversizedFileBytes),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "File must be 10 MB or smaller.",
    );

    await user.upload(input, createFile("replacement.png", "image/png", 1024));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Selected: replacement.png")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: imageContent.id,
        title: imageContent.title,
        file: expect.objectContaining({ name: "replacement.png" }),
      }),
    );
  });
});
