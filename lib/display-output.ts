export const DISPLAY_OUTPUT_TYPES = ["VGA", "HDMI", "DP"] as const;

export type DisplayOutputType = (typeof DISPLAY_OUTPUT_TYPES)[number];

const OUTPUT_PATTERN = /^([a-z]+)-(\d+)$/i;

const isOutputType = (value: string): value is DisplayOutputType =>
  DISPLAY_OUTPUT_TYPES.includes(value as DisplayOutputType);

export const toCanonicalDisplayOutput = (input: {
  type: DisplayOutputType;
  index: number;
}): string => `${input.type.toLowerCase()}-${String(input.index)}`;

export const parseDisplayOutput = (
  value: string | null | undefined,
): {
  type: DisplayOutputType;
  index: number;
} | null => {
  if (!value) {
    return null;
  }
  const match = OUTPUT_PATTERN.exec(value.trim());
  if (!match || !match[1] || !match[2]) {
    return null;
  }

  const type = match[1].toUpperCase();
  const index = Number.parseInt(match[2], 10);
  if (!isOutputType(type) || Number.isNaN(index) || index < 0) {
    return null;
  }
  return { type, index };
};
