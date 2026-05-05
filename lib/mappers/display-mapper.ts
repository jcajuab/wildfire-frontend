import type { BackendDisplay } from "@/lib/api/displays-api";
import type { Display, DisplayGroupLabel } from "@/types/display";

export function mapDisplayApiToDisplay(
  display: BackendDisplay,
  groups: readonly DisplayGroupLabel[] = [],
): Display {
  return {
    id: display.id,
    slug: display.slug,
    name: display.name,
    createdAt: display.createdAt,
    status: display.status,
    output: display.output,
    groups: [...groups],
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
