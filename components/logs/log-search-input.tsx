"use client";

import { SearchControl } from "@/components/common/search-control";

interface LogSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function LogSearchInput({
  value,
  onChange,
  className,
}: LogSearchInputProps): React.ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder="Search logs…"
      ariaLabel="Search logs"
      className={className}
    />
  );
}
