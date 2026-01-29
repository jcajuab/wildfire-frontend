"use client";

import {
  IconDotsVertical,
  IconPencil,
  IconEye,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Content } from "@/types/content";

interface ContentCardProps {
  readonly content: Content;
  readonly onEdit: (content: Content) => void;
  readonly onPreview: (content: Content) => void;
  readonly onDelete: (content: Content) => void;
}

export function ContentCard({
  content,
  onEdit,
  onPreview,
  onDelete,
}: ContentCardProps): React.ReactElement {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md">
      {/* Thumbnail area */}
      <div className="flex aspect-[4/3] items-center justify-center bg-muted/50">
        <IconWorld className="size-12 text-muted-foreground/50" />
      </div>

      {/* Content info */}
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-sm font-medium">{content.title}</h3>
          <p className="text-xs text-muted-foreground">
            by {content.createdBy.name}
          </p>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <IconDotsVertical className="size-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem onClick={() => onEdit(content)}>
              <IconPencil className="size-4" />
              Edit Content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreview(content)}>
              <IconEye className="size-4" />
              Preview Content
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(content)}
              className="text-destructive focus:text-destructive"
            >
              <IconTrash className="size-4" />
              Delete Content
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
