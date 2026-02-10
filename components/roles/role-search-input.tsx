"use client";

import { SearchControl } from "@/components/common/search-control";

interface RoleSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function RoleSearchInput({
  value,
  onChange,
  className,
}: RoleSearchInputProps): React.ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder="Search roles…"
      ariaLabel="Search roles"
      className={className}
    />
  );
}
