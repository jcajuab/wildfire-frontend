"use client";

import { IconSearch } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";

interface PlaylistSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
}

export function PlaylistSearchInput({
  value,
  onChange,
  placeholder = "Search playlists...",
}: PlaylistSearchInputProps): React.ReactElement {
  return (
    <div className="relative">
      <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-48 pl-8"
      />
    </div>
  );
}
