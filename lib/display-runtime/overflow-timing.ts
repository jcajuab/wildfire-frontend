export interface RuntimeContent {
  readonly type: "IMAGE" | "VIDEO" | "TEXT";
  readonly width: number | null;
  readonly height: number | null;
}

export interface RuntimeManifestItem {
  readonly id: string;
  readonly duration: number;
  readonly content: RuntimeContent;
}

export interface RuntimeItemTiming {
  readonly id: string;
  readonly baseDurationSeconds: number;
  readonly overflowExtraSeconds: number;
  readonly effectiveDurationSeconds: number;
}

const toPositive = (value: number, fallback: number): number =>
  Number.isFinite(value) && value > 0 ? value : fallback;

export const buildRuntimeTimings = (input: {
  items: readonly RuntimeManifestItem[];
}): readonly RuntimeItemTiming[] =>
  input.items.map((item) => {
    const baseDurationSeconds = toPositive(item.duration, 1);
    return {
      id: item.id,
      baseDurationSeconds,
      overflowExtraSeconds: 0,
      effectiveDurationSeconds: baseDurationSeconds,
    };
  });
