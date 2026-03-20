"use client";

import { useEffect } from "react";

export function DevAccessibilityChecker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      import("@axe-core/react").then((axe) => {
        import("react-dom").then((ReactDOM) => {
          import("react").then((React) => {
            axe.default(React.default, ReactDOM.default, 1000);
          });
        });
      });
    }
  }, []);

  return null;
}
