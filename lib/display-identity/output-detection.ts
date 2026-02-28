export interface DetectedDisplayOutput {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

export async function detectDisplayOutputs(): Promise<DetectedDisplayOutput[]> {
  if (typeof window === "undefined") {
    return [];
  }

  const viewportOutput: DetectedDisplayOutput = {
    name: "primary",
    width: window.screen.width,
    height: window.screen.height,
  };

  // Browser runtimes cannot reliably enumerate all physical outputs.
  // Use the current screen as detected output and rely on manual override for others.
  return [viewportOutput];
}
