import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import * as contentThumbnailPreview from "@/lib/content-thumbnail-preview";
import { DisplayTextContent } from "./display-text-content";

describe("DisplayTextContent", () => {
  test("sanitizes incoming html and renders centered runtime text classes", () => {
    const sanitizeSpy = vi.spyOn(
      contentThumbnailPreview,
      "sanitizeRichTextHtml",
    );
    const html =
      '<p>Line one</p><p>Line two<script>alert("x")</script></p><table><tbody><tr><th>Head</th></tr><tr><td>Cell</td></tr></tbody></table>';

    const { container } = render(<DisplayTextContent html={html} />);

    expect(sanitizeSpy).toHaveBeenCalledWith(html);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "items-center",
      "justify-center",
      "overflow-hidden",
      "bg-white",
      "p-8",
    );

    const inner = wrapper.firstElementChild as HTMLElement;
    expect(inner).toHaveClass(
      "display-text-table",
      "max-w-full",
      "text-7xl",
      "[overflow-wrap:anywhere]",
    );
    expect(inner).not.toHaveClass("text-4xl");
    expect(inner).toHaveTextContent("Line one");
    expect(inner).toHaveTextContent("Line two");
    expect(inner.querySelector("script")).not.toBeInTheDocument();
    expect(inner.querySelector("table")).toBeInTheDocument();
    expect(inner.querySelector("th")).toHaveTextContent("Head");
    expect(inner.querySelector("td")).toHaveTextContent("Cell");
  });

  test("renders multiline rich text content", () => {
    const html = "<p>Morning update</p><p>Second line</p><p>Third line</p>";

    const { container } = render(<DisplayTextContent html={html} />);

    const inner = container.querySelector(".display-text-table") as HTMLElement;
    expect(inner).toHaveTextContent(/Morning update/);
    expect(inner).toHaveTextContent(/Second line/);
    expect(inner).toHaveTextContent(/Third line/);
  });

  test("adds explicit wrapping support for long unbroken text", () => {
    const html =
      "<p>SuperLongRuntimeTextWithoutNaturalSpacesToForceWrappingAcrossTheViewport</p>";

    const { container } = render(<DisplayTextContent html={html} />);

    const inner = container.querySelector(".display-text-table") as HTMLElement;
    expect(inner).toHaveClass("max-w-full", "[overflow-wrap:anywhere]");
    expect(inner).toHaveTextContent(
      /SuperLongRuntimeTextWithoutNaturalSpacesToForceWrappingAcrossTheViewport/,
    );
  });
});
