export type DisplayImageSizing =
  | { readonly mode: "fit" }
  | {
      readonly mode: "capped";
      readonly width: number;
      readonly height: number;
    };

const DEFAULT_MAX_IMAGE_UPSCALE = 4;

const isPositiveFiniteNumber = (
  value: number | null | undefined,
): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const resolveDisplayImageSizing = (input: {
  readonly imageWidth: number | null | undefined;
  readonly imageHeight: number | null | undefined;
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly maxUpscale?: number;
}): DisplayImageSizing => {
  const maxUpscale = input.maxUpscale ?? DEFAULT_MAX_IMAGE_UPSCALE;
  const imageWidth = input.imageWidth;
  const imageHeight = input.imageHeight;

  if (
    !isPositiveFiniteNumber(imageWidth) ||
    !isPositiveFiniteNumber(imageHeight) ||
    !isPositiveFiniteNumber(input.containerWidth) ||
    !isPositiveFiniteNumber(input.containerHeight) ||
    !isPositiveFiniteNumber(maxUpscale)
  ) {
    return { mode: "fit" };
  }

  const fitScale = Math.min(
    input.containerWidth / imageWidth,
    input.containerHeight / imageHeight,
  );

  if (fitScale <= maxUpscale) {
    return { mode: "fit" };
  }

  return {
    mode: "capped",
    width: Math.round(imageWidth * maxUpscale),
    height: Math.round(imageHeight * maxUpscale),
  };
};
