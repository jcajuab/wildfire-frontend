/**
 * Canonical list of audit resource types used by the backend.
 * Used for the Logs page Resource Type filter dropdown and for display labels.
 */
const RESOURCE_TYPES = [
  "audit-event",
  "content",
  "device",
  "device-group",
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
  user: "User",
  role: "Role",
  permission: "Permission",
  content: "Content Item",
  playlist: "Playlist",
  "playlist-item": "Playlist Item",
  schedule: "Schedule",
  device: "Displays",
  "device-group": "Device Group",
  setting: "Setting",
  "role-deletion-request": "Role Deletion Request",
  "policy-history": "Policy History",
  session: "Session",
  invitation: "Invitation",
  "audit-event": "Audit Event",
};

const titleCaseLabel = (value: string): string =>
  value
    .replaceAll("-", " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

/** Get display label for a resource type; fallback to dashed value with spaces. */
export function getResourceTypeLabel(value: string): string {
  return RESOURCE_TYPE_LABELS[value] ?? titleCaseLabel(value);
}

/** Resolve typed/select input into canonical resource type value. */
export function getResourceTypeValueFromInput(
  input: string,
): ResourceTypeFilter | null {
  const normalizedInput = input.trim().toLowerCase();
  if (normalizedInput.length === 0) {
    return "";
  }

  const directMatch = RESOURCE_TYPES.find((value) => value === normalizedInput);
  if (directMatch) {
    return directMatch;
  }

  const labelMatch = RESOURCE_TYPES.find(
    (value) => getResourceTypeLabel(value).toLowerCase() === normalizedInput,
  );
  return labelMatch ?? null;
}
