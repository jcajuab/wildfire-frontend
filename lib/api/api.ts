import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQuery } from "@/lib/api/base-query";

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  keepUnusedDataFor: 300,
  tagTypes: [
    "AICredential",
    "AuditEvent",
    "Content",
    "ContentJob",
    "Display",
    "DisplayGroup",
    "Permission",
    "Playlist",
    "Role",
    "RuntimeOverrides",
    "Schedule",
    "User",
  ],
  endpoints: () => ({}),
});
