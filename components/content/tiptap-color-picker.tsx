"use client";

import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  variant?: "text" | "background";
}

const colors = [
  "#000000",
  "#FFFFFF",
  "#374151",
  "#6B7280",
  "#9CA3AF",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F472B6",
];

export function ColorPicker({
  currentColor,
  onColorChange,
  variant = "text",
}: ColorPickerProps): ReactElement {
  const isBackground = variant === "background";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={isBackground ? "Background Color" : "Text Color"}
          className="relative"
        >
          {isBackground ? (
            <span
              className="block size-4 rounded-sm border border-border"
              style={{
                backgroundColor:
                  currentColor === "transparent" ? undefined : currentColor,
              }}
            />
          ) : (
            <span className="text-sm font-bold">A</span>
          )}
          {!isBackground && (
            <span
              className="absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: currentColor }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-6 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={cn(
                "size-6 rounded-md border border-border",
                currentColor === color && "ring-2 ring-primary ring-offset-2",
              )}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
