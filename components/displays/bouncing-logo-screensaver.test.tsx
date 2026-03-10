import { render } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { BouncingLogoScreensaver } from "./bouncing-logo-screensaver";

describe("BouncingLogoScreensaver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("renders with black background container", () => {
    render(<BouncingLogoScreensaver />);

    const container = document.querySelector(".bg-black");
    expect(container).toBeInTheDocument();
  });

  test("renders WILDFIRE logo text", () => {
    render(<BouncingLogoScreensaver />);

    const svgText = document.querySelector("text");
    expect(svgText).toBeInTheDocument();
    expect(svgText?.textContent).toBe("WILDFIRE");
  });

  test("renders SVG logo element", () => {
    render(<BouncingLogoScreensaver />);

    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 200 80");
  });

  test("has aria-hidden for accessibility", () => {
    render(<BouncingLogoScreensaver />);

    const container = document.querySelector('[aria-hidden="true"]');
    expect(container).toBeInTheDocument();
  });

  test("starts animation on mount", () => {
    render(<BouncingLogoScreensaver />);

    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  test("cleans up animation on unmount", () => {
    const { unmount } = render(<BouncingLogoScreensaver />);

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
