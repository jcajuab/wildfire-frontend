"use client";

import { type ReactElement, memo } from "react";
import Image from "next/image";
import {
  IconDotsVertical,
  IconDownload,
  IconPencil,
  IconEye,
  IconFileTypePdf,
  IconPhoto,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatContentStatus } from "@/lib/formatters";
import type { Content } from "@/types/content";

interface ContentCardProps {
  readonly content: Content;
  readonly onEdit: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete: (content: Content) => void;
  readonly onDownload: (content: Content) => void;
  readonly canUpdate?: boolean;
  readonly canDelete?: boolean;
  readonly canDownload?: boolean;
}

export const ContentCard = memo(function ContentCard({
  content,
  onEdit,
  onPreview,
  onDelete,
  onDownload,
  canUpdate = true,
  canDelete = true,
  canDownload = true,
}: ContentCardProps): ReactElement {
  const ThumbnailFallbackIcon =
    content.type === "PDF"
      ? IconFileTypePdf
      : content.type === "VIDEO"
        ? IconVideo
        : IconPhoto;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-2">
      {/* Thumbnail area */}
      <div className="flex aspect-4/3 items-center justify-center bg-muted/50">
        {content.thumbnailUrl ? (
          <Image
            src={content.thumbnailUrl}
            alt=""
            width={400}
            height={300}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : (
          <ThumbnailFallbackIcon
            className="size-7 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content info */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-sm font-medium">{content.title}</h3>
          <p className="text-xs text-muted-foreground">
            by {content.createdBy.name}
          </p>
          <div className="pt-1">
            <Badge variant="outline">
              {formatContentStatus(content.status)}
            </Badge>
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${content.title}`}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <IconDotsVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {canUpdate && (
              <DropdownMenuItem onClick={() => onEdit(content)}>
                <IconPencil className="size-4" />
                Edit Content
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onPreview(content)}>
              <IconEye className="size-4" />
              View Details
            </DropdownMenuItem>
            {canDownload && (
              <DropdownMenuItem onClick={() => onDownload(content)}>
                <IconDownload className="size-4" />
                Download File
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(content)}
              >
                <IconTrash className="size-4" />
                Delete Content
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
