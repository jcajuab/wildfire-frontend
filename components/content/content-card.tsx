"use client";

import { type ReactElement, memo } from "react";
import Image from "next/image";
import {
  IconDots,
  IconDownload,
  IconPencil,
  IconEye,
  IconPhoto,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  getTextThumbnailHtml,
  getTextThumbnailText,
} from "@/lib/content-thumbnail-preview";
import { RICH_TEXT_PREVIEW_CLASSES } from "@/lib/rich-text-preview-classes";
import type { Content, ContentType } from "@/types/content";
import { FlashTonePreview } from "./flash-tone-preview";

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  FLASH: "Flash",
  TEXT: "Text",
};

interface ContentCardProps {
  readonly content: Content;
  readonly onEdit?: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete?: (content: Content) => void;
  readonly onDownload?: (content: Content) => void;
}

export const ContentCard = memo(function ContentCard({
  content,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
}: ContentCardProps): ReactElement {
  const canDownloadFile =
    onDownload && content.type !== "FLASH" && content.type !== "TEXT";
  const isFlashContent = content.type === "FLASH";
  const isTextContent = content.type === "TEXT";
  const flashThumbnailText = isFlashContent
    ? getFlashThumbnailText(content)
    : null;
  const textThumbnailText = isTextContent
    ? getTextThumbnailText(content)
    : null;
  const textThumbnailHtml = isTextContent
    ? getTextThumbnailHtml(content)
    : null;
  const flashTone = content.flashTone ?? "INFO";

  const ThumbnailFallbackIcon =
    content.type === "VIDEO" ? IconVideo : IconPhoto;

  return (
    <article className="group flex min-h-28 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors duration-150">
      {/* Zone A — Card header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold">{content.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${content.title}`}
              className="shrink-0"
            >
              <IconDots className="size-4" aria-hidden="true" />
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
            {onDelete ? (
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
            ? "items-center justify-center overflow-hidden"
            : "items-center justify-center",
        )}
      >
        {isFlashContent ? (
          <FlashTonePreview
            tone={flashTone}
            message={flashThumbnailText ?? ""}
          />
        ) : isTextContent ? (
          <div className="relative flex h-full w-full items-start overflow-hidden p-2">
            <div
              className={cn(
                RICH_TEXT_PREVIEW_CLASSES,
                "text-xs leading-snug [&_blockquote]:my-1 [&_blockquote]:border-l [&_blockquote]:border-border [&_blockquote]:pl-2 [&_ol]:my-1 [&_ol]:ml-4 [&_td]:px-1 [&_td]:py-0.5 [&_th]:px-1 [&_th]:py-0.5 [&_ul]:my-1 [&_ul]:ml-4",
              )}
              aria-label={textThumbnailText ?? content.title}
              dangerouslySetInnerHTML={{ __html: textThumbnailHtml ?? "" }}
            />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-muted/90 to-transparent" />
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
          <span className="text-xs font-medium text-muted-foreground">
            Created at
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateWithTime(content.createdAt)}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Updated at
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateWithTime(content.updatedAt || content.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
});
