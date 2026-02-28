/**
 * Canonical list of audit resource types used by the backend.
 * Used for the Logs page Resource Type filter dropdown and for display labels.
 */
const RESOURCE_TYPES = [
  "audit-event",
  "content",
  "display",
  "display-group",
  "invitation",
  "permission",
  "playlist",
  "playlist-item",
  "policy-history",
  "role",
  "role-deletion-request",
  "schedule",
  "session",
  "setting",
  "user",
] as const;

export type ResourceTypeValue = (typeof RESOURCE_TYPES)[number];

/** Value for "All resource types" (empty filter). */
export type ResourceTypeFilter = "" | ResourceTypeValue;

/**
 * Sentinel value for the "All" option in the Radix Select UI only.
 * Radix Select.Item does not allow value=""; use this for the Select and map to "" for state/URL.
 */
export const RESOURCE_TYPE_SELECT_ALL_VALUE = "__all__";

/** Options for the Resource Type Select: "" plus all resource type values. */
export const RESOURCE_TYPE_FILTER_OPTIONS: readonly ResourceTypeFilter[] = [
  "",
  ...RESOURCE_TYPES,
];

/** Human-readable labels for resource types (dropdown and table display). */
export const RESOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  user: "user",
  role: "role",
  permission: "permission",
  content: "content item",
  playlist: "playlist",
  "playlist-item": "playlist item",
  schedule: "schedule",
  display: "display",
  "display-group": "display group",
  setting: "setting",
  "role-deletion-request": "role deletion request",
  "policy-history": "policy history",
  session: "session",
  invitation: "invitation",
  "audit-event": "audit event",
};

/** Get display label for a resource type; fallback to dashed value with spaces. */
export function getResourceTypeLabel(value: string): string {
  return RESOURCE_TYPE_LABELS[value] ?? value.replaceAll("-", " ");
}
