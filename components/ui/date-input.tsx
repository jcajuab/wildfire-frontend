"use client";
import { Input } from "@/components/ui/input";

interface DateInputProps extends Omit<
  React.ComponentProps<"input">,
  "type" | "defaultValue"
> {
  value?: string;
}

export function DateInput({ value = "", onChange, ...props }: DateInputProps) {
  return (
    <Input type="date" value={value} onChange={onChange} {...props} />
  );
}
