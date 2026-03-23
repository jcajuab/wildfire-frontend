import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { aiCredentialsApi } from "@/lib/api/ai-credentials-api";
import { auditApi } from "@/lib/api/audit-api";
import { contentApi } from "@/lib/api/content-api";
import { displaysApi } from "@/lib/api/displays-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import { rbacApi } from "@/lib/api/rbac-api";
import { schedulesApi } from "@/lib/api/schedules-api";

export const adminApiReducers = {
  [aiCredentialsApi.reducerPath]: aiCredentialsApi.reducer,
  [auditApi.reducerPath]: auditApi.reducer,
  [contentApi.reducerPath]: contentApi.reducer,
  [rbacApi.reducerPath]: rbacApi.reducer,
  [displaysApi.reducerPath]: displaysApi.reducer,
  [playlistsApi.reducerPath]: playlistsApi.reducer,
  [schedulesApi.reducerPath]: schedulesApi.reducer,
};

export const adminApiMiddleware = [
  aiCredentialsApi.middleware,
  auditApi.middleware,
  contentApi.middleware,
  rbacApi.middleware,
  displaysApi.middleware,
  playlistsApi.middleware,
  schedulesApi.middleware,
] as const;

export const makeStore = () => {
  const store = configureStore({
    reducer: adminApiReducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(...adminApiMiddleware),
  });
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
