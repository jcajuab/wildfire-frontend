"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";

export function DevAccessibilityChecker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      process.env.NEXT_PUBLIC_ENABLE_AXE !== "true"
    ) {
      return;
    }

    const start = () => {
      void import("@axe-core/react").then((axe) => {
        axe.default(React, ReactDOM, 1000);
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(start, 1500);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return null;
}
