"use client";

import { IconSearch } from "@tabler/icons-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface LogSearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function LogSearchInput({
  value,
  onChange,
}: LogSearchInputProps): React.ReactElement {
  return (
    <InputGroup className="w-[250px]">
      <InputGroupAddon align="inline-start">
        <IconSearch className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Search logs..."
        aria-label="Search logs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </InputGroup>
  );
}
