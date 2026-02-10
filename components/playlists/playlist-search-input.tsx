"use client";

import { SearchControl } from "@/components/common/search-control";

interface PlaylistSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
}

export function PlaylistSearchInput({
  value,
  onChange,
  placeholder = "Search playlists…",
  className,
}: PlaylistSearchInputProps): React.ReactElement {
  return (
    <SearchControl
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      ariaLabel="Search playlists"
      className={className}
    />
  );
}
