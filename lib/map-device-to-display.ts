import type { Device } from "@/lib/api/devices-api";
import type { Display } from "@/types/display";

export function mapDeviceToDisplay(device: Device): Display {
  const resolution =
    device.screenWidth != null && device.screenHeight != null
      ? `${device.screenWidth}x${device.screenHeight}`
      : "Not available";
  return {
    id: device.id,
    identifier: device.identifier,
    name: device.name,
    location: device.location ?? "",
    createdAt: device.createdAt,
    status: device.onlineStatus,
    ipAddress: device.ipAddress ?? "",
    macAddress: device.macAddress ?? "",
    displayOutput: device.outputType ?? "Not available",
    resolution,
    groups: [],
    nowPlaying: null,
  };
}

export function withDisplayGroups(
  display: Display,
  groups: readonly string[],
): Display {
  return {
    ...display,
    groups: [...groups],
  };
}
