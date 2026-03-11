export interface RuntimeContent {
  readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT";
  readonly width: number | null;
  readonly height: number | null;
  readonly scrollPxPerSecond?: number | null;
}

export interface RuntimeManifestItem {
  readonly id: string;
  readonly duration: number;
  readonly content: RuntimeContent;
}

export interface RuntimeViewport {
  readonly width: number;
  readonly height: number;
}

export interface OverflowTimingConfig {
  readonly scrollPixelsPerSecond: number;
}

export interface RuntimeItemTiming {
  readonly id: string;
  readonly baseDurationSeconds: number;
  readonly overflowExtraSeconds: number;
  readonly effectiveDurationSeconds: number;
}

const toPositive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const computeOverflowExtraSeconds = (input: {
  item: RuntimeManifestItem;
  viewport: RuntimeViewport;
  config: OverflowTimingConfig;
  measuredContentHeight?: number;
}): number => {
  const _unused = input;
  return 0;
};

export const buildRuntimeTimings = (input: {
  items: readonly RuntimeManifestItem[];
  viewport: RuntimeViewport;
  config: OverflowTimingConfig;
  measuredHeightByItemId?: Readonly<Record<string, number>>;
}): readonly RuntimeItemTiming[] =>
  input.items.map((item) => {
    const overflowExtraSeconds = computeOverflowExtraSeconds({
      item,
      viewport: input.viewport,
      config: input.config,
      measuredContentHeight: input.measuredHeightByItemId?.[item.id],
    });
    const baseDurationSeconds = toPositive(item.duration, 1);
    return {
      id: item.id,
      baseDurationSeconds,
      overflowExtraSeconds,
      effectiveDurationSeconds: baseDurationSeconds + overflowExtraSeconds,
    };
  });
