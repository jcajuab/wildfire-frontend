"use client";

import { SearchControl } from "@/components/common/search-control";

interface UserSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function UserSearchInput({
  value,
  onChange,
  className,
}: UserSearchInputProps): React.ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder="Search users…"
      ariaLabel="Search users"
      className={className}
    />
  );
}
