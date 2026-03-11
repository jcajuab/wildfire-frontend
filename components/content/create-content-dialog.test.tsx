import { act, fireEvent, render, screen } from "@testing-library/react";
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

const renderDialog = (): void => {
  render(
    <CreateContentDialog
      open
      onOpenChange={onOpenChange}
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

  test("debounces ticker preview updates by 500ms while keeping character count immediate", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("tab", { name: "Flash" }));
    vi.useFakeTimers();

    fireEvent.change(screen.getByLabelText("Ticker Message"), {
      target: { value: "HELLO WORLD" },
    });

    expect(screen.getByText("11/240 characters")).toBeInTheDocument();
    expect(
      screen.getByText("Ticker preview", { selector: "p" }),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(499);
    });
    expect(
      screen.getByText("Ticker preview", { selector: "p" }),
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

    renderDialog();

    await user.click(screen.getByRole("tab", { name: "Flash" }));

    const infoBadge = screen.getByText("INFO");
    expectClassTokens(infoBadge, getFlashBadgeClassName("INFO"));

    await user.click(screen.getByRole("combobox", { name: "Tone" }));
    await user.click(screen.getByRole("option", { name: "Critical" }));

    const criticalBadge = screen.getByText("CRITICAL");
    expectClassTokens(criticalBadge, getFlashBadgeClassName("CRITICAL"));

    expect(
      document.querySelector('[class*="bg-muted/20"][class*="rounded-xl"]'),
    ).toBeNull();
  });

  test("applies shared overflow-safe sizing classes for long ticker input", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("tab", { name: "Flash" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("min-w-0");

    const tickerTextarea = screen.getByLabelText("Ticker Message");
    expect(tickerTextarea).toHaveClass("min-w-0", "max-w-full", "break-words");
    expect(tickerTextarea.className).toContain("[overflow-wrap:anywhere]");
    expect(tickerTextarea.className).not.toContain("field-sizing-content");
  });
});
