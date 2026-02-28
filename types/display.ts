export type DisplayStatus = "READY" | "LIVE" | "DOWN";

export interface DisplayOutput {
  readonly name: string;
  readonly resolution: string;
}

export interface NowPlaying {
  readonly title: string | null;
  readonly playlist: string | null;
  readonly progress: number;
  readonly duration: number;
}

export interface DisplayGroup {
  readonly name: string;
  readonly colorIndex?: number;
}

export interface Display {
  readonly id: string;
  readonly displaySlug?: string;
  /** Backend display identifier (for registration/debugging). */
  readonly identifier?: string;
  readonly name: string;
  readonly status: DisplayStatus;
  readonly location: string;
  readonly ipAddress: string;
  readonly macAddress: string;
  readonly displayOutput: string;
  readonly resolution: string;
  /** Group names with optional color index for badge styling. */
  readonly groups: readonly DisplayGroup[];
  readonly nowPlaying: NowPlaying | null;
  readonly createdAt: string;
}

export type DisplaySortField = "alphabetical" | "status" | "location";

export interface DisplayFilter {
  readonly status?: DisplayStatus;
  readonly search?: string;
  readonly sortBy?: DisplaySortField;
}
