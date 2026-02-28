import type { Display as DisplayApi } from "@/lib/api/devices-api";
import type { Display, DisplayGroup } from "@/types/display";

export function mapDisplayApiToDisplay(display: DisplayApi): Display {
  const resolution =
    display.screenWidth != null && display.screenHeight != null
      ? `${display.screenWidth}x${display.screenHeight}`
      : "Not available";
  return {
    id: display.id,
    identifier: display.identifier,
    name: display.name,
    location: display.location ?? "",
    createdAt: display.createdAt,
    status: display.onlineStatus,
    ipAddress: display.ipAddress ?? "",
    macAddress: display.macAddress ?? "",
    displayOutput: display.outputType ?? "Not available",
    resolution,
    groups: [],
    nowPlaying: null,
  };
}

/**
 * Attaches display groups with optional colorIndex for badge styling.
 * Pass group metadata (e.g. from display groups API) to get colorIndex per name.
 */
export function withDisplayGroups(
  display: Display,
  groups: readonly DisplayGroup[],
): Display {
  return {
    ...display,
    groups: [...groups],
  };
}
