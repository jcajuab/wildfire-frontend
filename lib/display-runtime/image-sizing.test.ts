import { describe, expect, test } from "vitest";
import { resolveDisplayImageSizing } from "@/lib/display-runtime/image-sizing";

describe("display image sizing", () => {
  test("uses normal fit when image matches the media area", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 1920,
        imageHeight: 1080,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "fit" });
  });

  test("uses normal fit when image is larger than the media area", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 3840,
        imageHeight: 2160,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "fit" });
  });

  test("uses normal fit for acceptable upscaling up to four times", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 480,
        imageHeight: 270,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "fit" });
  });

  test("caps low-resolution image rendering beyond four times", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 320,
        imageHeight: 180,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "capped", width: 1280, height: 720 });
  });

  test("caps tiny square images without stretching to the media area", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 32,
        imageHeight: 32,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "capped", width: 128, height: 128 });
  });

  test("uses measured media area after flash ticker space is removed", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: 640,
        imageHeight: 360,
        containerWidth: 1920,
        containerHeight: 972,
      }),
    ).toEqual({ mode: "fit" });

    expect(
      resolveDisplayImageSizing({
        imageWidth: 320,
        imageHeight: 180,
        containerWidth: 1920,
        containerHeight: 972,
      }),
    ).toEqual({ mode: "capped", width: 1280, height: 720 });
  });

  test("falls back to normal fit when dimensions are missing", () => {
    expect(
      resolveDisplayImageSizing({
        imageWidth: null,
        imageHeight: 360,
        containerWidth: 1920,
        containerHeight: 1080,
      }),
    ).toEqual({ mode: "fit" });
  });
});
