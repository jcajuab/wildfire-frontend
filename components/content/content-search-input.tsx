"use client";

import { SearchControl } from "@/components/common/search-control";

interface ContentSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
}

export function ContentSearchInput({
  value,
  onChange,
  placeholder = "Search content…",
  className,
}: ContentSearchInputProps): React.ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel="Search content"
      className={className}
    />
  );
}
