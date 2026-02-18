import type { Device } from "@/lib/api/devices-api";
import type { Display } from "@/types/display";

export function mapDeviceToDisplay(device: Device): Display {
  return {
    id: device.id,
    identifier: device.identifier,
    name: device.name,
    location: device.location ?? "",
    createdAt: device.createdAt,
    status: device.onlineStatus,
    ipAddress: "",
    macAddress: "",
    displayOutput: "",
    resolution: "",
    groups: [],
    nowPlaying: null,
  };
}
