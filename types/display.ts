export type DisplayStatus = "PROCESSING" | "READY" | "LIVE" | "DOWN";

export interface DisplayOutput {
  readonly name: string;
}

export interface DisplayGroupLabel {
  readonly name: string;
}

export interface Display {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: DisplayStatus;
  readonly output: string;
  readonly groups: readonly DisplayGroupLabel[];
  readonly createdAt: string;
}

/** "all" is the sentinel for no filter; output type filters use values like "hdmi-*". */
export type DisplayOutputFilter = string;
