"use client";

import { type ReactElement, memo } from "react";
import Image from "next/image";
import {
  IconDots,
  IconDownload,
  IconFileTypePdf,
  IconPencil,
  IconEye,
  IconPhoto,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  formatContentStatus,
  formatDateWithTime,
  formatFileSize,
  getContentStatusBadgeClassName,
} from "@/lib/formatters";
import {
  getFlashThumbnailText,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import { getFlashBadgeClassName } from "@/lib/display-runtime/flash-ticker";
import type { Content, ContentType } from "@/types/content";

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  PDF: "PDF",
  FLASH: "Flash",
  TEXT: "Text",
};

export type ContentCardDisplayMode = "default" | "pdf-page-item";

interface ContentCardProps {
  readonly content: Content;
  readonly displayMode?: ContentCardDisplayMode;
  readonly isPdfRootExpandable?: boolean;
  readonly isPdfRootExpanded?: boolean;
  readonly onTogglePdfRootExpand?: (content: Content) => void;
  readonly isExclusionToggleDisabled?: boolean;
  readonly onToggleExclusion?: (
    content: Content,
    nextIsExcluded: boolean,
  ) => Promise<void>;
  readonly onEdit?: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete?: (content: Content) => void;
  readonly onDownload?: (content: Content) => void;
}

export const ContentCard = memo(function ContentCard({
  content,
  displayMode = "default",
  isPdfRootExpandable = false,
  isPdfRootExpanded = false,
  onTogglePdfRootExpand,
  isExclusionToggleDisabled = false,
  onToggleExclusion,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
}: ContentCardProps): ReactElement {
  const isPdfRoot = content.type === "PDF" && content.kind === "ROOT";
  const isPdfPageItem = displayMode === "pdf-page-item";
  const canTogglePdfRoot = isPdfRoot && isPdfRootExpandable;
  const canDownloadFile =
    onDownload && content.type !== "FLASH" && content.type !== "TEXT";
  const pageLabel =
    content.pageNumber !== null ? `Page ${content.pageNumber}` : null;
  const rootPageCount =
    content.pageCount === null
      ? "Page count unknown"
      : content.pageCount === 1
        ? "1 page"
        : `${content.pageCount} pages`;
  const isFlashContent = content.type === "FLASH";
  const isTextContent = content.type === "TEXT";
  const flashThumbnailText = isFlashContent
    ? getFlashThumbnailText(content)
    : null;
  const textThumbnailText = isTextContent ? getTextThumbnailText(content) : null;
  const flashTone = content.flashTone ?? "INFO";

  const ThumbnailFallbackIcon =
    content.type === "PDF"
      ? IconFileTypePdf
      : content.type === "VIDEO"
        ? IconVideo
        : IconPhoto;

  const handleRootToggle = () => {
    if (!canTogglePdfRoot || !onTogglePdfRootExpand) {
      return;
    }
    onTogglePdfRootExpand(content);
  };

  const cardClassName = cn(
    "group flex min-h-28 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150",
    canTogglePdfRoot && isPdfRootExpanded && "border-primary/60 bg-primary/5",
  );

  return (
    <div className={cardClassName}>
      {/* Zone A — Card header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold">
            {isPdfPageItem && pageLabel ? pageLabel : content.title}
          </h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${content.title}`}
              className="shrink-0"
              data-prevent-card-toggle="true"
            >
              <IconDots className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {onEdit ? (
              <DropdownMenuItem onClick={() => onEdit(content)}>
                <IconPencil className="size-4" />
                Edit Content
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => onPreview(content)}>
              <IconEye className="size-4" />
              View Details
            </DropdownMenuItem>
            {canDownloadFile ? (
              <DropdownMenuItem onClick={() => onDownload(content)}>
                <IconDownload className="size-4" />
                Download File
              </DropdownMenuItem>
            ) : null}
            {onDelete && !isPdfPageItem ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(content)}
              >
                <IconTrash className="size-4" />
                Delete Content
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Zone B — Thumbnail (16:9) */}
      <div
        className={cn(
          "relative flex aspect-video bg-muted/50",
          isTextContent
            ? "items-center justify-center overflow-visible"
            : "items-center justify-center",
        )}
      >
        {isPdfRoot ? (
          <div className="relative h-full w-full p-3">
            <div className="absolute inset-x-8 top-4 bottom-3 rotate-6 rounded-md border border-border/80 bg-card/80" />
            <div className="absolute inset-x-7 top-3 bottom-4 -rotate-3 rounded-md border border-border/80 bg-card/90" />
            <div className="absolute inset-x-6 top-2 bottom-5 rounded-md border border-border bg-card">
              {content.thumbnailUrl ? (
                <Image
                  src={content.thumbnailUrl}
                  alt={`${content.title} preview`}
                  width={400}
                  height={225}
                  unoptimized
                  className="h-full w-full rounded-md object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ThumbnailFallbackIcon
                    className="size-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          </div>
        ) : isFlashContent ? (
          <div className="flex h-full w-full items-center justify-center py-2">
            <div
              className={cn(
                "flex h-10 min-w-0 w-[90%] overflow-hidden border border-border/80 bg-white sm:h-11 sm:w-[95%]",
              )}
            >
              <div
                className={cn(
                  "flex h-full shrink-0 items-center justify-center px-2 text-[10px] font-extrabold leading-none tracking-[0.14em] sm:px-3 sm:text-xs",
                  getFlashBadgeClassName(flashTone),
                )}
              >
                {flashTone}
              </div>
              <div className="flex min-w-0 flex-1 items-center overflow-hidden bg-white px-2 sm:px-3">
                <p className="w-full truncate text-xs font-semibold leading-tight text-foreground sm:text-sm">
                  {flashThumbnailText}
                </p>
              </div>
            </div>
          </div>
        ) : isTextContent ? (
          <div className="flex h-full w-full items-center justify-center overflow-visible p-2">
            <p className="max-w-full text-center text-xs leading-snug whitespace-pre-wrap break-words text-foreground">
              {textThumbnailText}
            </p>
          </div>
        ) : (
          <>
            {content.thumbnailUrl ? (
              <Image
                src={content.thumbnailUrl}
                alt={`${content.title} preview`}
                width={400}
                height={225}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <ThumbnailFallbackIcon
                className="size-7 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </div>

      {/* Zone C — Footer metadata */}
      <div className="flex flex-col justify-between gap-3 p-3 pt-2">
        {/* Status + type + size pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(getContentStatusBadgeClassName(content.status))}
          >
            {formatContentStatus(content.status)}
          </Badge>
          <Separator orientation="vertical" className="h-4 bg-border/80" />
          <Badge variant="outline">{CONTENT_TYPE_LABEL[content.type]}</Badge>
          <Badge variant="outline">{formatFileSize(content.fileSize)}</Badge>
        </div>
        {/* Owner */}
        <p className="truncate text-xs text-muted-foreground">
          @{content.owner.name}
        </p>
        {/* Dates */}
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <span className="text-xs font-medium text-muted-foreground">Created at</span>
          <span className="text-xs text-muted-foreground">{formatDateWithTime(content.createdAt)}</span>
          <span className="text-xs font-medium text-muted-foreground">Updated at</span>
          <span className="text-xs text-muted-foreground">{formatDateWithTime(content.updatedAt || content.createdAt)}</span>
        </div>
        {/* PDF root: page count + expand/collapse button */}
        {canTogglePdfRoot ? (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs text-muted-foreground">
              {rootPageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleRootToggle}
              aria-expanded={isPdfRootExpanded}
              aria-controls={`pdf-pages-${content.id}`}
              aria-label={
                isPdfRootExpanded
                  ? `Collapse pages for ${content.title}`
                  : `Expand pages for ${content.title}`
              }
            >
              {isPdfRootExpanded ? "Collapse pages" : "Expand pages"}
            </Button>
          </div>
        ) : isPdfRoot ? (
          <p className="text-xs text-muted-foreground">{rootPageCount}</p>
        ) : null}
        {/* PDF page item: exclusion toggle */}
        {isPdfPageItem && onToggleExclusion ? (
          <div
            className="flex items-center justify-between pt-0.5"
            data-prevent-card-toggle="true"
          >
            <span className="text-xs text-muted-foreground">
              Exclude from playback
            </span>
            <Switch
              checked={content.isExcluded}
              disabled={isExclusionToggleDisabled}
              aria-label={`Exclude ${pageLabel ?? content.title} from playback`}
              data-prevent-card-toggle="true"
              onCheckedChange={(checked) => {
                void onToggleExclusion(content, checked);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});
