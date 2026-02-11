import type { Device } from "@/lib/api/devices-api";
import type { Display } from "@/types/display";

/**
 * Maps a backend Device to the frontend Display type.
 * Backend only has id, identifier, name, location, createdAt, updatedAt;
 * missing fields are set to placeholders.
 */
export function mapDeviceToDisplay(device: Device): Display {
  return {
    id: device.id,
    identifier: device.identifier,
    name: device.name,
    location: device.location ?? "",
    createdAt: device.createdAt,
    status: "READY",
    ipAddress: "",
    macAddress: "",
    displayOutput: "—",
    resolution: "—",
    groups: [],
    nowPlaying: null,
  };
}
