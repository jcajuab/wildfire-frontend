"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface DateInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue"
> {
  value?: string;
}

export function DateInput({ value = "", onChange, ...props }: DateInputProps) {
  // Track the external value that was last used to mount the input.
  // When the external value changes, update the seed to force a remount.
  const [seed, setSeed] = useState(value);
  if (value !== seed) {
    setSeed(value);
  }

  return (
    <Input
      key={seed}
      type="date"
      defaultValue={value}
      onChange={onChange}
      {...props}
    />
  );
}
