"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";

export function DevAccessibilityChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void import("@axe-core/react").then((axe) => {
        axe.default(React, ReactDOM, 1000);
      });
    }
  }, []);

  return null;
}
