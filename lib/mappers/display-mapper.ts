import type { BackendDisplay } from "@/lib/api/displays-api";
import type { Display, DisplayGroupLabel } from "@/types/display";

export function mapDisplayApiToDisplay(
  display: BackendDisplay,
  groups: readonly DisplayGroupLabel[] = [],
): Display {
  const resolution =
    display.screenWidth != null && display.screenHeight != null
      ? `${display.screenWidth}x${display.screenHeight}`
      : "Not available";
  return {
    id: display.id,
    slug: display.slug,
    name: display.name,
    location: display.location ?? "",
    createdAt: display.createdAt,
    status: display.status,
    ipAddress: display.ipAddress ?? "",
    macAddress: display.macAddress ?? "",
    output: display.output ?? "Not available",
    resolution,
    emergencyContentId: display.emergencyContentId ?? null,
    groups: [...groups],
    nowPlaying: display.nowPlaying
      ? {
          title: display.nowPlaying.title,
          playlist: display.nowPlaying.playlist,
          progress: Math.max(0, display.nowPlaying.progress),
          duration: Math.max(0, display.nowPlaying.duration),
        }
      : null,
  };
}

export function withDisplayGroups(
  display: Display,
  groups: readonly DisplayGroupLabel[],
): Display {
  return {
    ...display,
    groups: [...groups],
  };
}
