/**
 * Predefined palette for display group badges (fill and outline variants).
 * colorIndex from the backend maps to palette index % PALETTE_SIZE.
 */
const PALETTE_SIZE = 12;

export interface GroupBadgeStyles {
  readonly fill: string;
  readonly outline: string;
}

interface GroupWithColorIndex {
  readonly colorIndex?: number;
}

const PALETTE: readonly GroupBadgeStyles[] = [
  {
    fill: "bg-red-500 text-white",
    outline: "border-red-500 text-red-500 bg-transparent",
  },
  {
    fill: "bg-amber-500 text-white",
    outline: "border-amber-500 text-amber-500 bg-transparent",
  },
  {
    fill: "bg-yellow-500 text-white",
    outline: "border-yellow-500 text-yellow-500 bg-transparent",
  },
  {
    fill: "bg-lime-500 text-white",
    outline: "border-lime-500 text-lime-500 bg-transparent",
  },
  {
    fill: "bg-green-500 text-white",
    outline: "border-green-500 text-green-500 bg-transparent",
  },
  {
    fill: "bg-emerald-500 text-white",
    outline: "border-emerald-500 text-emerald-500 bg-transparent",
  },
  {
    fill: "bg-cyan-500 text-white",
    outline: "border-cyan-500 text-cyan-500 bg-transparent",
  },
  {
    fill: "bg-sky-500 text-white",
    outline: "border-sky-500 text-sky-500 bg-transparent",
  },
  {
    fill: "bg-blue-500 text-white",
    outline: "border-blue-500 text-blue-500 bg-transparent",
  },
  {
    fill: "bg-violet-500 text-white",
    outline: "border-violet-500 text-violet-500 bg-transparent",
  },
  {
    fill: "bg-fuchsia-500 text-white",
    outline: "border-fuchsia-500 text-fuchsia-500 bg-transparent",
  },
  {
    fill: "bg-pink-500 text-white",
    outline: "border-pink-500 text-pink-500 bg-transparent",
  },
] as const;

/**
 * Returns badge class names for a given color index (e.g. from display group).
 * Uses fill variant by default; use .outline for outline variant.
 */
export function getGroupBadgeStyles(colorIndex: number): GroupBadgeStyles {
  const index =
    typeof colorIndex === "number" && Number.isFinite(colorIndex)
      ? ((colorIndex % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE
      : 0;
  return PALETTE[index] ?? PALETTE[0];
}

/**
 * Returns the next color index in cycle order based on existing groups.
 * If there are no groups, starts at 0.
 */
export function getNextDisplayGroupColorIndex(
  groups: readonly GroupWithColorIndex[],
): number {
  if (groups.length === 0) return 0;
  const maxColorIndex = Math.max(
    ...groups.map((group) => group.colorIndex ?? 0),
  );
  return (((maxColorIndex + 1) % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE;
}

export { PALETTE_SIZE };
