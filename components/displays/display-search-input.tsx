"use client";

import type { ReactElement } from "react";
import { SearchControl } from "@/components/common/search-control";

interface DisplaySearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function DisplaySearchInput({
  value,
  onChange,
  className,
}: DisplaySearchInputProps): ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder="Search displays…"
      ariaLabel="Search displays"
      className={className}
    />
  );
}
