export type DisplayStatus = "PROCESSING" | "READY" | "LIVE" | "DOWN";

export interface DisplayOutput {
  readonly name: string;
  readonly resolution: string;
}

interface NowPlaying {
  readonly title: string | null;
  readonly playlist: string | null;
  readonly progress: number;
  readonly duration: number;
}

export interface DisplayGroupLabel {
  readonly name: string;
}

export interface Display {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly status: DisplayStatus;
  readonly location: string;
  readonly ipAddress: string;
  readonly macAddress: string;
  readonly output: string;
  readonly resolution: string;
  readonly emergencyContentId: string | null;
  readonly groups: readonly DisplayGroupLabel[];
  readonly nowPlaying: NowPlaying | null;
  readonly createdAt: string;
}

/** "all" is the sentinel for no filter; any other string is an output name. */
export type DisplayOutputFilter = string;
