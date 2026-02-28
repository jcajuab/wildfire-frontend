export interface RuntimeContent {
  readonly type: "IMAGE" | "VIDEO" | "PDF";
  readonly width: number | null;
  readonly height: number | null;
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
  const { item, viewport, config } = input;
  if (item.content.type !== "IMAGE" && item.content.type !== "PDF") {
    return 0;
  }
  if (
    item.content.width === null ||
    item.content.height === null ||
    item.content.width <= 0 ||
    item.content.height <= 0
  ) {
    return 0;
  }

  const scaledHeight =
    typeof input.measuredContentHeight === "number" &&
    Number.isFinite(input.measuredContentHeight) &&
    input.measuredContentHeight > 0
      ? input.measuredContentHeight
      : (viewport.width / item.content.width) * item.content.height;
  const verticalOverflow = Math.max(0, scaledHeight - viewport.height);
  const speed = toPositive(config.scrollPixelsPerSecond, 24);
  if (verticalOverflow <= 0) {
    return 0;
  }
  return Math.ceil(verticalOverflow / speed);
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
