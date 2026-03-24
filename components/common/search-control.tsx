"use client";
import type { ReactElement } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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
        enterKeyHint="search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value !== "") onChange("");
        }}
      />
      {value !== "" ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={() => onChange("")}
            aria-label="Clear search"
          >
            <IconX className="size-3.5" aria-hidden="true" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
