"use client";

import type { ReactElement } from "react";
import { IconLink, IconLinkOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LinkPopoverProps {
  isActive: boolean;
  currentUrl: string;
  onSetLink: (url: string) => void;
  onUnsetLink: () => void;
}

export function LinkPopover({
  isActive,
  currentUrl,
  onSetLink,
  onUnsetLink,
}: LinkPopoverProps): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={isActive ? "secondary" : "ghost"}
          size="icon-sm"
          title="Link"
        >
          <IconLink className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <Label htmlFor="link-url">URL</Label>
          <Input
            id="link-url"
            placeholder="https://example.com"
            defaultValue={currentUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSetLink((e.target as HTMLInputElement).value);
              }
            }}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                const input = (e.target as HTMLElement)
                  .closest(".space-y-2")
                  ?.querySelector("input");
                if (input) {
                  onSetLink(input.value);
                }
              }}
            >
              Set Link
            </Button>
            {isActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUnsetLink}
              >
                <IconLinkOff className="mr-1 size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
