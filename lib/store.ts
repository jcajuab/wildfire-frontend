import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { devicesApi } from "@/lib/api/devices-api";
import { rbacApi } from "@/lib/api/rbac-api";

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [rbacApi.reducerPath]: rbacApi.reducer,
      [devicesApi.reducerPath]: devicesApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(rbacApi.middleware, devicesApi.middleware),
  });
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
