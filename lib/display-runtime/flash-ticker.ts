import type { CSSProperties } from "react";

export type FlashTone = "INFO" | "WARNING" | "CRITICAL";

const MIN_FLASH_HEIGHT_PX = 36;
const MIN_FLASH_SPEED_PX_PER_SECOND = 12;
const MAX_FLASH_HEIGHT_VIEWPORT_RATIO = 0.35;
const MIN_FLASH_REPEAT_COUNT = 4;
const EXTRA_FLASH_REPEAT_UNITS = 2;
const MIN_ESTIMATED_FLASH_UNIT_WIDTH_PX = 120;
const ESTIMATED_FLASH_CHARACTER_WIDTH_PX = 11;
const FLASH_UNIT_GAP_PX = 40;

const FLASH_TONE_BADGE_CLASSNAME: Record<FlashTone, string> = {
  INFO: "bg-primary text-primary-foreground",
  WARNING: "bg-yellow-400 text-black",
  CRITICAL: "bg-destructive text-white",
};

const DEFAULT_BADGE_CLASSNAME = "bg-primary text-primary-foreground";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const getFlashMarqueeMessage = (message: string): string | null => {
  const normalized = message.trim();
  return normalized.length > 0 ? normalized : null;
};

const estimateFlashUnitWidthPx = (message: string): number => {
  const normalized = getFlashMarqueeMessage(message) ?? "";
  return Math.max(
    MIN_ESTIMATED_FLASH_UNIT_WIDTH_PX,
    normalized.length * ESTIMATED_FLASH_CHARACTER_WIDTH_PX + FLASH_UNIT_GAP_PX,
  );
};

export const inferFlashRepeatCount = (input: {
  message: string;
  containerWidthPx: number;
}): number => {
  const unitWidthPx = estimateFlashUnitWidthPx(input.message);
  const widthPx = Math.max(1, input.containerWidthPx);
  const minimumUnitsToFill = Math.ceil(widthPx / unitWidthPx);
  return Math.max(
    MIN_FLASH_REPEAT_COUNT,
    minimumUnitsToFill + EXTRA_FLASH_REPEAT_UNITS,
  );
};

export const getFlashBadgeClassName = (
  tone: string | null | undefined,
): string => {
  if (tone === "INFO" || tone === "WARNING" || tone === "CRITICAL") {
    return FLASH_TONE_BADGE_CLASSNAME[tone];
  }
  return DEFAULT_BADGE_CLASSNAME;
};

export const buildFlashMarqueeStyle = (input: {
  message: string;
  heightPx: number;
  speedPxPerSecond: number;
  repeatCount: number;
  viewportWidth: number;
  viewportHeight: number;
}): CSSProperties => {
  const maxHeightPx = Math.max(
    MIN_FLASH_HEIGHT_PX,
    Math.floor(input.viewportHeight * MAX_FLASH_HEIGHT_VIEWPORT_RATIO),
  );
  const safeHeightPx = clamp(input.heightPx, MIN_FLASH_HEIGHT_PX, maxHeightPx);
  const safeSpeedPxPerSecond = Math.max(
    MIN_FLASH_SPEED_PX_PER_SECOND,
    input.speedPxPerSecond,
  );
  const estimatedCycleDistancePx = Math.max(
    input.viewportWidth,
    estimateFlashUnitWidthPx(input.message) * Math.max(1, input.repeatCount),
  );
  const durationSeconds = Math.max(
    8,
    Math.round(estimatedCycleDistancePx / safeSpeedPxPerSecond),
  );

  return {
    "--wildfire-flash-duration": `${durationSeconds}s`,
    height: `${safeHeightPx}px`,
  } as CSSProperties;
};
