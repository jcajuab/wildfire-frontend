import type { Device } from "@/lib/api/devices-api";
import type { Display } from "@/types/display";

/**
 * Maps a backend Device to the frontend Display type.
 * Only maps fields the backend actually provides.
 * Fields not available from the backend are set to explicit "Not available" placeholders.
 */
export function mapDeviceToDisplay(device: Device): Display {
  return {
    id: device.id,
    identifier: device.identifier,
    name: device.name,
    location: device.location ?? "",
    createdAt: device.createdAt,
    status: "READY",
    ipAddress: "Not available",
    macAddress: "Not available",
    displayOutput: "Not available",
    resolution: "Not available",
    groups: [],
    nowPlaying: null,
  };
}
