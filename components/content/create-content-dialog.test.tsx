import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { getFlashBadgeClassName } from "@/lib/display-runtime/flash-ticker";
import { CreateContentDialog } from "@/components/content/create-content-dialog";

const onOpenChange = vi.fn();
const onUploadFile = vi.fn();
const onCreateFlash = vi.fn();
const onCreateText = vi.fn();

const expectClassTokens = (element: HTMLElement, className: string): void => {
  className
    .split(" ")
    .filter((token) => token.length > 0)
    .forEach((token) => {
      expect(element).toHaveClass(token);
    });
};

const renderDialog = (mode: "upload" | "flash" | "text" = "upload"): void => {
  render(
    <CreateContentDialog
      open
      onOpenChange={onOpenChange}
      mode={mode}
      onUploadFile={onUploadFile}
      onCreateFlash={onCreateFlash}
      onCreateText={onCreateText}
    />,
  );
};

describe("CreateContentDialog", () => {
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

  afterEach(() => {
    vi.useRealTimers();
  });

  test("debounces flash preview updates by 500ms while keeping character count immediate", async () => {
    renderDialog("flash");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Create Flash Content");
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText("Flash Content Message"), {
      target: { value: "HELLO WORLD" },
    });

    expect(screen.getByText("11/120 characters")).toBeInTheDocument();
    expect(
      screen.getByText("Flash content preview", { selector: "p" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(
      screen.getByText("Flash content preview", { selector: "p" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(
      screen.getByText("HELLO WORLD", { selector: "p" }),
    ).toBeInTheDocument();
  });

  test("uses tone badge styling in the single live preview", async () => {
    const user = userEvent.setup();

    renderDialog("flash");

    const infoBadge = screen.getByText("INFO");
    expectClassTokens(infoBadge, getFlashBadgeClassName("INFO"));

    await user.click(
      screen.getByRole("combobox", { name: "Flash Content Tone" }),
    );
    await user.click(screen.getByRole("option", { name: "Critical" }));

    const criticalBadge = screen.getByText("CRITICAL");
    expectClassTokens(criticalBadge, getFlashBadgeClassName("CRITICAL"));

    expect(
      document.querySelector('[class*="bg-muted/20"][class*="rounded-xl"]'),
    ).toBeNull();
  });

  test("uses expanded flash content layout and professional field copy", async () => {
    renderDialog("flash");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("min-w-0");
    expect(dialog).toHaveClass("sm:max-w-2xl");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toHaveClass("overflow-hidden");
    expect(
      screen.getByText("Create a short flash message for display playback."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Flash Content Title")).toHaveAttribute(
      "placeholder",
      "Enter flash content title",
    );

    const flashTextarea = screen.getByLabelText("Flash Content Message");
    expect(flashTextarea).toHaveAttribute(
      "placeholder",
      "Enter the flash message to display",
    );
    expect(flashTextarea).toHaveClass(
      "min-w-0",
      "max-w-full",
      "break-words",
      "min-h-28",
      "resize-y",
    );
    expect(flashTextarea.className).toContain("[overflow-wrap:anywhere]");
    expect(flashTextarea.className).not.toContain("field-sizing-content");
    expect(
      screen.getByRole("combobox", { name: "Flash Content Tone" }),
    ).toHaveClass("w-full");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create flash/i }),
    ).not.toBeInTheDocument();
  });

  test("uses consistent upload copy and footer actions", () => {
    renderDialog("upload");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Upload File");
    expect(
      screen.getByText("Add a media file for display playback."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Content Title")).toHaveAttribute(
      "placeholder",
      "Enter content title",
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Upload file/i }),
    ).not.toBeInTheDocument();
  });

  test("uses expanded text content layout and concise editor metadata", async () => {
    renderDialog("text");

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Create Text Content");
    expect(dialog).toHaveClass("sm:max-w-4xl");
    expect(dialog).toHaveClass("max-h-[calc(100dvh-2rem)]");
    expect(dialog).toHaveClass("overflow-hidden");

    expect(
      screen.getByText("Create formatted text content for display playback."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Text Content Title")).toHaveAttribute(
      "placeholder",
      "Enter text content title",
    );
    expect(screen.getByText("Text Content Message")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Create text/i }),
    ).not.toBeInTheDocument();

    expect(await screen.findByText("0 / 1000 characters")).toBeInTheDocument();
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
