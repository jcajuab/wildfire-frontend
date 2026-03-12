"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { IconFileTypePdf, IconPhoto, IconVideo } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  formatContentStatus,
  getContentStatusBadgeClassName,
} from "@/lib/formatters";
import type { Content } from "@/types/content";

interface ContentPagesSheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly parentContent: Content | null;
  readonly pages: readonly Content[];
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly updatingPageId: string | null;
  readonly onToggleExclusion: (
    page: Content,
    nextIsExcluded: boolean,
  ) => Promise<void>;
}

export function ContentPagesSheet({
  open,
  onOpenChange,
  parentContent,
  pages,
  isLoading,
  errorMessage,
  updatingPageId,
  onToggleExclusion,
}: ContentPagesSheetProps): ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {parentContent ? `${parentContent.title} Pages` : "PDF Pages"}
          </SheetTitle>
          <SheetDescription>
            Each page is treated as an individual content item when playlists
            expand PDF documents for display playback. Excluded pages are
            skipped.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              Loading pages...
            </p>
          ) : null}
          {!isLoading && errorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          {!isLoading && !errorMessage && pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pages are available for this PDF.
            </p>
          ) : null}

          {!isLoading && !errorMessage && pages.length > 0 ? (
            <ul className="space-y-3" aria-label="PDF page items">
              {pages.map((page) => {
                const disabled =
                  page.status !== "READY" || updatingPageId === page.id;
                const pageLabel =
                  page.pageNumber !== null
                    ? `Page ${page.pageNumber}`
                    : page.title;
                const ThumbnailFallbackIcon =
                  page.type === "PDF"
                    ? IconFileTypePdf
                    : page.type === "VIDEO"
                      ? IconVideo
                      : IconPhoto;
                return (
                  <li key={page.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md border bg-muted/50">
                        {page.thumbnailUrl ? (
                          <Image
                            src={page.thumbnailUrl}
                            alt={`${pageLabel} preview`}
                            fill
                            unoptimized
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ThumbnailFallbackIcon
                              className="size-5 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{pageLabel}</p>
                          <Badge
                            variant="outline"
                            className={getContentStatusBadgeClassName(page.status)}
                          >
                            {formatContentStatus(page.status)}
                          </Badge>
                          {page.isExcluded ? (
                            <Badge variant="secondary">Excluded</Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {page.title}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          Exclude
                        </span>
                        <Switch
                          checked={page.isExcluded}
                          disabled={disabled}
                          aria-label={`Exclude ${pageLabel} from playback`}
                          onCheckedChange={(checked) => {
                            void onToggleExclusion(page, checked);
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
