"use client";

import type { ReactElement } from "react";
import { IconSearch } from "@tabler/icons-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface SearchControlProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly ariaLabel: string;
  readonly placeholder?: string;
  readonly className?: string;
}

export function SearchControl({
  value,
  onChange,
  ariaLabel,
  placeholder = "Search…",
  className,
}: SearchControlProps): ReactElement {
  return (
    <InputGroup className={cn("w-full min-w-52 max-w-80", className)}>
      <InputGroupAddon align="inline-start">
        <IconSearch className="size-4" aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        name="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </InputGroup>
  );
}
