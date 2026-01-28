"use client";

import { IconFilter } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DisplayFilterPopover(): React.ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="default">
          <IconFilter className="size-4" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Filter options coming soon
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
