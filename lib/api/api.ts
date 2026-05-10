import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";
import { WILDFIRE_SERVER_REVALIDATE_SECONDS } from "@/lib/wildfire-server-revalidate-seconds";

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  keepUnusedDataFor: WILDFIRE_SERVER_REVALIDATE_SECONDS,
  tagTypes: [
    "AICredential",
    "AuditEvent",
    "Content",
    "ContentJob",
    "Display",
    "DisplayGroup",
    "EmergencySlots",
    "Invitation",
    "Permission",
    "Playlist",
    "Role",
    "RuntimeOverrides",
    "Schedule",
    "User",
  ],
  endpoints: () => ({}),
});
