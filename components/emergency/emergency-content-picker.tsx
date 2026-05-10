"use client";

import { useCallback, useMemo, useState, type ReactElement } from "react";
import Image from "next/image";
import {
  IconFileText,
  IconLoader2,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react";

import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useListContentQuery,
  type BackendContentListItem,
} from "@/lib/api/content-api";
import {
  getTextThumbnailHtml,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";
import type { EmergencySlotIndex } from "@/lib/api/emergency-slots-api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 9;

interface EmergencyContentPickerProps {
  readonly selectedSlotIndex: EmergencySlotIndex | null;
  readonly onSelect: (content: BackendContentListItem) => void;
  readonly submittingContentId?: string | null;
}

export function EmergencyContentPicker({
  selectedSlotIndex,
  onSelect,
  submittingContentId = null,
}: EmergencyContentPickerProps): ReactElement {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const { data, isFetching } = useListContentQuery({
    page,
    pageSize: PAGE_SIZE,
    status: "READY",
    excludeType: "FLASH",
    search: debouncedSearch || undefined,
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const isPickerDisabled = selectedSlotIndex === null;
  const isSubmitting = submittingContentId !== null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <header>
          <h3 className="text-sm font-medium">Content Library</h3>
        </header>
        <SearchControl
          value={search}
          onChange={handleSearchChange}
          ariaLabel="Search emergency content"
          placeholder="Search available content..."
          className="max-w-none min-w-0 w-full"
        />
        <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          {isFetching && items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Loading content...
            </p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No READY image, video, or text content found.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <CompactContentCard
                    content={item}
                    disabled={isPickerDisabled || isSubmitting}
                    isSubmitting={submittingContentId === item.id}
                    onSelect={() => onSelect(item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <PaginationFooter
        page={page}
        pageSize={data?.pageSize ?? PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
        className="border-t border-border bg-background"
        alwaysShow
      />
    </div>
  );
}

interface CompactContentCardProps {
  readonly content: BackendContentListItem;
  readonly disabled: boolean;
  readonly isSubmitting: boolean;
  readonly onSelect: () => void;
}

function CompactContentCard({
  content,
  disabled,
  isSubmitting,
  onSelect,
}: CompactContentCardProps): ReactElement {
  const isTextContent = content.type === "TEXT";
  const textThumbnailHtml = isTextContent
    ? getTextThumbnailHtml(content)
    : null;
  const textThumbnailText = isTextContent
    ? getTextThumbnailText(content)
    : null;
  const Icon =
    content.type === "VIDEO"
      ? IconVideo
      : content.type === "TEXT"
        ? IconFileText
        : IconPhoto;

  const card = (
    <button
      type="button"
      aria-label={`Select ${content.title} as emergency content`}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-md border border-border bg-background text-left transition-[border-color,background-color,opacity] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:cursor-not-allowed",
        disabled ? "opacity-60" : "hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <span className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/50">
        {isTextContent && textThumbnailHtml ? (
          <span className="relative flex h-full w-full items-start overflow-hidden p-2">
            <span
              className={cn(
                RICH_TEXT_PREVIEW_CLASSES,
                "text-[0.625rem] leading-snug [&_blockquote]:my-1 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-2 [&_ol]:my-1 [&_ol]:ml-4 [&_td]:px-1 [&_td]:py-0.5 [&_th]:px-1 [&_th]:py-0.5 [&_ul]:my-1 [&_ul]:ml-4",
              )}
              aria-label={textThumbnailText ?? content.title}
              dangerouslySetInnerHTML={{ __html: textThumbnailHtml }}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-muted/90 to-transparent" />
          </span>
        ) : content.thumbnailUrl ? (
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
        {isSubmitting ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <IconLoader2
              className="size-4 animate-spin text-primary"
              aria-hidden="true"
            />
          </span>
        ) : null}
      </span>
      <span className="flex min-h-10 items-center justify-between gap-2 p-2">
        <span className="truncate text-xs font-medium" title={content.title}>
          {content.title}
        </span>
      </span>
    </button>
  );

  return (
    <article className="h-full">
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block h-full">{card}</span>
          </TooltipTrigger>
          <TooltipContent>Pick an empty slot first</TooltipContent>
        </Tooltip>
      ) : (
        card
      )}
    </article>
  );
}
