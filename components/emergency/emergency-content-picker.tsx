"use client";

import { useMemo, useState, type ReactElement } from "react";
import Image from "next/image";
import { IconPhoto, IconSearch, IconVideo } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import { useListContentQuery, type BackendContent } from "@/lib/api/content-api";
import type { EmergencySlotIndex } from "@/lib/api/emergency-slots-api";

const ALLOWED_TYPES = new Set<BackendContent["type"]>(["IMAGE", "VIDEO", "TEXT"]);

interface EmergencyContentPickerProps {
  readonly selectedSlotIndex: EmergencySlotIndex | null;
  readonly onSelect: (content: BackendContent) => void;
  readonly isSubmitting?: boolean;
}

export function EmergencyContentPicker({
  selectedSlotIndex,
  onSelect,
  isSubmitting = false,
}: EmergencyContentPickerProps): ReactElement {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isFetching } = useListContentQuery({
    page: 1,
    pageSize: 30,
    status: "READY",
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });

  const items = useMemo(
    () => (data?.items ?? []).filter((item) => ALLOWED_TYPES.has(item.type)),
    [data?.items],
  );

  const isPickerDisabled = selectedSlotIndex === null;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">Content</h3>
        <p className="text-xs text-muted-foreground">
          Select a content to act as an emergency asset.
        </p>
      </header>
      <div className="relative">
        <IconSearch
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search content..."
          className="pl-8"
          aria-label="Search emergency content"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card p-2">
        {isFetching && items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Loading content...
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No READY image, video, or text content found.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <CompactContentCard
                  content={item}
                  disabled={isPickerDisabled || isSubmitting}
                  onSelect={() => onSelect(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface CompactContentCardProps {
  readonly content: BackendContent;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}

function CompactContentCard({
  content,
  disabled,
  onSelect,
}: CompactContentCardProps): ReactElement {
  const Icon = content.type === "VIDEO" ? IconVideo : IconPhoto;
  const button = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="w-full"
      disabled={disabled}
      onClick={onSelect}
    >
      Select
    </Button>
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-md border border-border bg-background">
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/50">
        {content.thumbnailUrl ? (
          <Image
            src={content.thumbnailUrl}
            alt={`${content.title} preview`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="flex flex-col gap-2 p-2">
        <p className="truncate text-xs font-medium" title={content.title}>
          {content.title}
        </p>
        {disabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block">{button}</span>
            </TooltipTrigger>
            <TooltipContent>Pick an empty slot first</TooltipContent>
          </Tooltip>
        ) : (
          button
        )}
      </div>
    </article>
  );
}
