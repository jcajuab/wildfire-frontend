"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";

interface StoreProviderProps {
  readonly children: React.ReactNode;
}

export default function StoreProvider({
  children,
}: StoreProviderProps): React.ReactElement {
  const [store] = useState(() => makeStore());
  return <Provider store={store}>{children}</Provider>;
}
