"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  memo,
} from "react";
import Image from "next/image";
import {
  IconDots,
  IconDownload,
  IconPencil,
  IconPhoto,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCanModifyResource } from "@/hooks/use-can-modify-resource";
import {
  formatContentStatus,
  formatDateWithTime,
  formatFileSize,
  formatRelativeTime,
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

const CARD_SELECTION_IGNORE_SELECTOR =
  "button,a,input,select,textarea,[role='button'],[role='menuitem'],[data-card-selection-ignore='true']";

interface ContentCardProps {
  readonly content: Content;
  readonly onEdit?: (content: Content) => void;
  readonly onDelete?: (content: Content) => void;
  readonly onDownload?: (content: Content) => void;
  readonly isSelected?: boolean;
  readonly onSelectionChange?: (content: Content, checked: boolean) => void;
}

function shouldIgnoreCardSelection(
  target: EventTarget | null,
  currentTarget: HTMLElement,
): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(CARD_SELECTION_IGNORE_SELECTOR);
  return interactiveElement !== null && interactiveElement !== currentTarget;
}

function getContentActivityLabel(content: Content): "Created" | "Updated" {
  return new Date(content.updatedAt).getTime() >
    new Date(content.createdAt).getTime()
    ? "Updated"
    : "Created";
}

function getContentOwnerHandle(content: Content): string {
  const username = content.owner.username?.trim();
  return username && username.length > 0 ? username : content.owner.name;
}

export const ContentCard = memo(function ContentCard({
  content,
  onEdit,
  onDelete,
  onDownload,
  isSelected = false,
  onSelectionChange,
}: ContentCardProps): ReactElement {
  const canModify = useCanModifyResource(content.owner.id);
  const canDownloadFile =
    onDownload && content.type !== "FLASH" && content.type !== "TEXT";
  const showEdit = canModify && Boolean(onEdit);
  const showDelete = canModify && Boolean(onDelete);
  const showSelection = canModify && Boolean(onSelectionChange);
  const showActions = showEdit || canDownloadFile || showDelete;
  const showDestructiveSeparator = showDelete && (showEdit || canDownloadFile);
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
  const activityLabel = getContentActivityLabel(content);
  const activityDate =
    activityLabel === "Updated" ? content.updatedAt : content.createdAt;
  const activityDateLabel = formatDateWithTime(activityDate);
  const activityRelativeLabel = formatRelativeTime(activityDate);
  const ownerHandle = getContentOwnerHandle(content);

  const ThumbnailFallbackIcon =
    content.type === "VIDEO" ? IconVideo : IconPhoto;
  const handleCardClick = (event: MouseEvent<HTMLElement>): void => {
    if (
      !showSelection ||
      shouldIgnoreCardSelection(event.target, event.currentTarget)
    ) {
      return;
    }

    onSelectionChange?.(content, !isSelected);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (
      !showSelection ||
      event.target !== event.currentTarget ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onSelectionChange?.(content, !isSelected);
  };

  return (
    <div
      id={`content-card-${content.id}`}
      data-state={isSelected ? "selected" : undefined}
      data-selection-mode={showSelection ? "true" : undefined}
      data-selection-muted={showSelection && !isSelected ? "true" : undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role={showSelection ? "button" : undefined}
      tabIndex={showSelection ? 0 : undefined}
      aria-pressed={showSelection ? isSelected : undefined}
      aria-label={showSelection ? `Select ${content.title}` : undefined}
      className={`group flex min-h-28 flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,background-color,filter,opacity] duration-150 data-[state=selected]:border-primary/60 data-[state=selected]:bg-primary/5 data-[state=selected]:opacity-100 data-[state=selected]:grayscale-0 motion-reduce:transition-none ${showSelection ? "cursor-pointer focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" : ""} ${showSelection && !isSelected ? "border-border/60 bg-muted/25 opacity-55 grayscale hover:border-primary/35 hover:bg-card hover:opacity-90 hover:grayscale-0" : ""}`}
    >
      {/* Zone A — Card header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showSelection ? (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelectionChange?.(content, checked === true)
              }
              aria-label={`Select ${content.title}`}
              data-card-selection-ignore="true"
            />
          ) : null}
          <h2 className="truncate text-base font-semibold">{content.title}</h2>
        </div>
        {showActions ? (
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
            <DropdownMenuContent
              align="start"
              className="w-max min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)]"
            >
              {showEdit && onEdit ? (
                <DropdownMenuItem onClick={() => onEdit(content)}>
                  <IconPencil className="size-4" />
                  Edit Content
                </DropdownMenuItem>
              ) : null}
              {canDownloadFile ? (
                <DropdownMenuItem onClick={() => onDownload(content)}>
                  <IconDownload className="size-4" />
                  Download File
                </DropdownMenuItem>
              ) : null}
              {showDestructiveSeparator ? <DropdownMenuSeparator /> : null}
              {showDelete && onDelete ? (
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
        ) : null}
      </div>

      {/* Zone B — Thumbnail (fixed 16:9) */}
      <div
        className={cn(
          "relative flex aspect-video overflow-hidden bg-muted/50",
          "items-center justify-center",
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
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                className="object-cover"
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
          <Badge variant="outline">{CONTENT_TYPE_LABEL[content.type]}</Badge>
          <Badge variant="outline">{formatFileSize(content.fileSize)}</Badge>
        </div>
        {/* Owner + latest activity */}
        <div
          className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
          title={`${activityLabel} ${activityDateLabel}`}
          aria-label={`Created by @${ownerHandle}. ${activityLabel} ${activityDateLabel}.`}
        >
          <span className="min-w-0 truncate">@{ownerHandle}</span>
          <span
            className="shrink-0 text-muted-foreground/70"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="shrink-0 font-medium">{activityLabel}</span>
          <span className="min-w-0 truncate">{activityRelativeLabel}</span>
        </div>
      </div>
    </div>
  );
});
