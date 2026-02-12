import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { auditApi } from "@/lib/api/audit-api";
import { contentApi } from "@/lib/api/content-api";
import { devicesApi } from "@/lib/api/devices-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import { rbacApi } from "@/lib/api/rbac-api";
import { schedulesApi } from "@/lib/api/schedules-api";

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [auditApi.reducerPath]: auditApi.reducer,
      [contentApi.reducerPath]: contentApi.reducer,
      [rbacApi.reducerPath]: rbacApi.reducer,
      [devicesApi.reducerPath]: devicesApi.reducer,
      [playlistsApi.reducerPath]: playlistsApi.reducer,
      [schedulesApi.reducerPath]: schedulesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        auditApi.middleware,
        contentApi.middleware,
        rbacApi.middleware,
        devicesApi.middleware,
        playlistsApi.middleware,
        schedulesApi.middleware,
      ),
  });
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
