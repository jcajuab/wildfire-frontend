import { describe, expect, test, vi } from "vitest";

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(),
}));

import { getCropActionToolbarStyle } from "@/components/content/pdf-crop-editor";

describe("getCropActionToolbarStyle", () => {
  const canvasSize = { width: 400, height: 300 };

  test("positions the toolbar near a normal crop", () => {
    const style = getCropActionToolbarStyle(
      { x: 100, y: 80, width: 120, height: 90 },
      canvasSize,
    );

    expect(style).toMatchObject({
      position: "absolute",
      left: 204,
      top: 216,
    });
  });

  test("keeps the toolbar inside the right edge of the canvas", () => {
    const style = getCropActionToolbarStyle(
      { x: 350, y: 80, width: 45, height: 90 },
      canvasSize,
    );

    expect(style.left).toBe(378);
  });

  test("keeps the toolbar inside the bottom edge of the canvas", () => {
    const style = getCropActionToolbarStyle(
      { x: 100, y: 260, width: 120, height: 35 },
      canvasSize,
    );

    expect(style.top).toBe(270);
  });

  test("keeps the toolbar visible for a bottom-right crop", () => {
    const style = getCropActionToolbarStyle(
      { x: 375, y: 275, width: 25, height: 25 },
      canvasSize,
    );

    expect(style).toMatchObject({
      left: 378,
      top: 285,
    });
  });
});
