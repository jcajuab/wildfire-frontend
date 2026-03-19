"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

interface DateInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "defaultValue"
> {
  value?: string;
}

export function DateInput({ value = "", onChange, ...props }: DateInputProps) {
  const lastExternalRef = useRef(value);
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    if (value !== lastExternalRef.current) {
      lastExternalRef.current = value;
      setRemountKey((k) => k + 1);
    }
  }, [value]);

  return (
    <Input
      key={remountKey}
      type="date"
      defaultValue={value}
      onChange={(e) => {
        lastExternalRef.current = e.target.value;
        onChange?.(e);
      }}
      {...props}
    />
  );
}
