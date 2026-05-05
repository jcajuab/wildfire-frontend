"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import Image from "next/image";
import { IconPhoto, IconVideo } from "@tabler/icons-react";

import { PaginationFooter } from "@/components/common/pagination-footer";
import { SearchControl } from "@/components/common/search-control";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useListContentQuery,
  type BackendContent,
} from "@/lib/api/content-api";
import {
  getTextThumbnailHtml,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";
import type { EmergencySlotIndex } from "@/lib/api/emergency-slots-api";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = new Set<BackendContent["type"]>([
  "IMAGE",
  "VIDEO",
  "TEXT",
]);
const PAGE_SIZE = 12;

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
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isFetching } = useListContentQuery({
    page,
    pageSize: PAGE_SIZE,
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
    <div className='flex min-h-0 flex-col gap-3'>
      <header className='flex flex-col gap-1'>
        <h3 className='text-sm font-medium'>Content</h3>
        <p className='text-xs text-muted-foreground'>
          Select a content to act as an emergency asset.
        </p>
      </header>
      <SearchControl
        value={search}
        onChange={setSearch}
        ariaLabel='Search emergency content'
        placeholder='Search content...'
        className='max-w-none min-w-0 w-full'
      />
      <div className='min-h-0 flex-1 overflow-auto'>
        {isFetching && items.length === 0 ? (
          <p className='px-2 py-6 text-center text-xs text-muted-foreground'>
            Loading content...
          </p>
        ) : items.length === 0 ? (
          <p className='px-2 py-6 text-center text-xs text-muted-foreground'>
            No READY image, video, or text content found.
          </p>
        ) : (
          <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
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
      <PaginationFooter
        page={page}
        pageSize={data?.pageSize ?? PAGE_SIZE}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
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
  const isTextContent = content.type === "TEXT";
  const textThumbnailHtml = isTextContent
    ? getTextThumbnailHtml(content)
    : null;
  const textThumbnailText = isTextContent
    ? getTextThumbnailText(content)
    : null;
  const Icon = content.type === "VIDEO" ? IconVideo : IconPhoto;
  const button = (
    <Button
      type='button'
      size='sm'
      variant='outline'
      className='h-auto w-full cursor-pointer border-border py-1 hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed'
      disabled={disabled}
      onClick={onSelect}
    >
      Select
    </Button>
  );

  return (
    <article className='flex flex-col overflow-hidden rounded-md border border-border bg-background'>
      <div className='relative flex aspect-video items-center justify-center overflow-hidden bg-muted/50'>
        {isTextContent ? (
          <div className='relative flex h-full w-full items-start overflow-hidden p-2'>
            <div
              className={cn(
                RICH_TEXT_PREVIEW_CLASSES,
                "text-xs leading-snug [&_blockquote]:my-1 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-2 [&_ol]:my-1 [&_ol]:ml-4 [&_td]:px-1 [&_td]:py-0.5 [&_th]:px-1 [&_th]:py-0.5 [&_ul]:my-1 [&_ul]:ml-4",
              )}
              aria-label={textThumbnailText ?? content.title}
              dangerouslySetInnerHTML={{ __html: textThumbnailHtml ?? "" }}
            />
            <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-linear-to-t from-muted/90 to-transparent' />
          </div>
        ) : content.thumbnailUrl ? (
          <Image
            src={content.thumbnailUrl}
            alt={`${content.title} preview`}
            fill
            sizes='(max-width: 768px) 50vw, 25vw'
            className='object-cover'
          />
        ) : (
          <Icon className='size-6 text-muted-foreground' aria-hidden='true' />
        )}
      </div>
      <div className='flex flex-col gap-2 p-2'>
        <p className='truncate text-xs font-medium' title={content.title}>
          {content.title}
        </p>
        {disabled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='block'>{button}</span>
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
