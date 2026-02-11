"use client";

import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";

interface StoreProviderProps {
  readonly children: ReactNode;
}

export default function StoreProvider({
  children,
}: StoreProviderProps): ReactElement {
  const [store] = useState(() => makeStore());
  return <Provider store={store}>{children}</Provider>;
}
