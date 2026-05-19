"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconFileText,
  IconPhoto,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLazyGetContentFileUrlQuery } from "@/lib/api/content-api";
import { useGetPlaylistQuery } from "@/lib/api/playlists-api";
import { formatDateWithTime, formatDuration } from "@/lib/formatters";
import { mapBackendPlaylistWithItems } from "@/lib/mappers/playlist-mapper";
import { cn } from "@/lib/utils";
import type { PlaylistDetail, PlaylistItem } from "@/types/playlist";

interface ViewPlaylistPageViewProps {
  readonly playlistId: string;
}

interface ViewPlaylistShellProps {
  readonly children: ReactElement;
  readonly onGoBack: () => void;
}

const contentTypeLabel: Record<PlaylistItem["content"]["type"], string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  TEXT: "Text",
};

function getContentIcon(type: PlaylistItem["content"]["type"]): ReactElement {
  if (type === "VIDEO") return <IconPlayerPlay className="size-4" />;
  if (type === "TEXT") return <IconFileText className="size-4" />;
  return <IconPhoto className="size-4" />;
}

function ViewPlaylistShell({
  children,
  onGoBack,
}: ViewPlaylistShellProps): ReactElement {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/95">
      <PageHeader title="View Playlist">
        <Button type="button" variant="outline" onClick={onGoBack}>
          <IconArrowLeft
            className="size-4"
            aria-hidden="true"
            data-icon="inline-start"
          />
          Go Back
        </Button>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </section>
    </div>
  );
}

function PlaylistItemThumbnail({
  item,
}: {
  readonly item: PlaylistItem;
}): ReactElement {
  if (item.content.thumbnailUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.content.thumbnailUrl}
        alt=""
        className="size-full object-cover"
      />
    );
  }

  if (item.content.type === "TEXT" && item.content.textPreviewText) {
    return (
      <span className="line-clamp-4 p-1 text-[7px] leading-tight text-foreground">
        {item.content.textPreviewText}
      </span>
    );
  }

  return (
    <span className="text-muted-foreground" aria-hidden="true">
      {getContentIcon(item.content.type)}
    </span>
  );
}

function PlaylistItemPreview({
  item,
}: {
  readonly item: PlaylistItem | null;
}): ReactElement {
  const [getContentFileUrl, fileUrlState] = useLazyGetContentFileUrlQuery();

  useEffect(() => {
    if (!item || item.content.type === "TEXT") return;
    void getContentFileUrl(item.content.id);
  }, [getContentFileUrl, item]);

  if (!item) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground xl:min-h-0">
        Select an item to preview its content.
      </div>
    );
  }

  const downloadUrl = fileUrlState.data?.downloadUrl;

  return (
    <section className="flex min-h-[24rem] flex-col overflow-hidden rounded-md border border-border bg-background xl:min-h-0">
      <div className="border-b border-border bg-muted/15 px-4 py-3">
        <h2 className="truncate text-sm font-semibold">{item.content.title}</h2>
        <p className="text-xs text-muted-foreground">
          {contentTypeLabel[item.content.type]} ·{" "}
          {formatDuration(item.duration)}
          {item.loop ? " · loops" : ""}
        </p>
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-muted/20 p-4">
        {item.content.type === "TEXT" ? (
          <p className="w-full whitespace-pre-wrap text-sm leading-6">
            {item.content.textPreviewText || "No text preview available."}
          </p>
        ) : fileUrlState.isFetching ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Loading preview...
          </p>
        ) : downloadUrl && item.content.type === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={downloadUrl}
            alt={item.content.title}
            className="mx-auto max-h-[52vh] w-auto max-w-full object-contain"
          />
        ) : downloadUrl && item.content.type === "VIDEO" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={downloadUrl}
            controls
            className="mx-auto max-h-[52vh] w-full max-w-full bg-black"
          />
        ) : item.content.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.content.thumbnailUrl}
            alt={item.content.title}
            className="mx-auto max-h-[52vh] w-auto max-w-full object-contain"
          />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Preview unavailable.
          </p>
        )}
      </div>
    </section>
  );
}

function PlaylistMetadata({
  playlist,
}: {
  readonly playlist: PlaylistDetail;
}): ReactElement {
  return (
    <section className="overflow-hidden rounded-md border border-border bg-background">
      <div className="border-b border-border bg-muted/15 p-4">
        <h2 className="text-sm font-semibold">Playlist Information</h2>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-tight">
            {playlist.name}
          </h3>
          {playlist.description ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {playlist.description}
            </p>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No description provided.
            </p>
          )}
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr_max-content_1fr]">
          <dt className="text-muted-foreground">Owner</dt>
          <dd>{playlist.owner.name}</dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd>{playlist.status === "IN_USE" ? "In Use" : "Draft"}</dd>
          <dt className="text-muted-foreground">Items</dt>
          <dd>{playlist.items.length}</dd>
          <dt className="text-muted-foreground">Total duration</dt>
          <dd>{formatDuration(playlist.totalDuration)}</dd>
          <dt className="text-muted-foreground">Show counter</dt>
          <dd>{playlist.showCounter ? "On" : "Off"}</dd>
          <dt className="text-muted-foreground">Updated</dt>
          <dd>{formatDateWithTime(playlist.updatedAt)}</dd>
        </dl>
      </div>
    </section>
  );
}

export function ViewPlaylistPageView({
  playlistId,
}: ViewPlaylistPageViewProps): ReactElement {
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { data, isFetching, isError } = useGetPlaylistQuery(playlistId);
  const playlist = useMemo(
    () => (data ? mapBackendPlaylistWithItems(data) : null),
    [data],
  );
  const selectedItem =
    playlist?.items.find((item) => item.id === selectedItemId) ??
    playlist?.items[0] ??
    null;

  if (isFetching && !playlist) {
    return (
      <ViewPlaylistShell onGoBack={() => router.back()}>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          <p className="text-sm text-muted-foreground">Loading playlist...</p>
        </div>
      </ViewPlaylistShell>
    );
  }

  if (isError || !playlist) {
    return (
      <ViewPlaylistShell onGoBack={() => router.back()}>
        <div className="flex min-h-0 flex-1 overflow-auto p-4">
          <EmptyState
            title="Unable to load playlist"
            description="The playlist could not be loaded or is no longer available."
            action={
              <Button type="button" onClick={() => router.back()}>
                Go Back
              </Button>
            }
          />
        </div>
      </ViewPlaylistShell>
    );
  }

  return (
    <ViewPlaylistShell onGoBack={() => router.back()}>
      <div className="flex min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
          <PlaylistMetadata playlist={playlist} />

          <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-background">
              <div className="border-b border-border bg-muted/15 p-4">
                <h2 className="text-sm font-semibold">Playlist Items</h2>
                <p className="text-xs text-muted-foreground">
                  Select an item to inspect its preview.
                </p>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
                {playlist.items.length === 0 ? (
                  <div className="flex min-h-64 flex-1 items-center justify-center rounded-md border border-dashed border-border bg-muted/20 px-4 py-8">
                    <EmptyState
                      title="No playlist items"
                      description="This playlist does not contain any content."
                    />
                  </div>
                ) : (
                  playlist.items.map((item) => {
                    const isSelected = item.id === selectedItem?.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        className={cn(
                          "grid w-full grid-cols-[2.5rem_3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected &&
                            "border-primary bg-primary/10 hover:bg-primary/10",
                        )}
                      >
                        <span className="text-sm font-semibold text-muted-foreground">
                          {item.sequence}
                        </span>
                        <span className="flex size-12 items-center justify-center overflow-hidden rounded bg-muted">
                          <PlaylistItemThumbnail item={item} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {item.content.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {contentTypeLabel[item.content.type]} ·{" "}
                            {formatDuration(item.duration)}
                            {item.loop ? " · loops" : ""}
                          </span>
                        </span>
                        <Badge variant="outline">
                          {contentTypeLabel[item.content.type]}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <PlaylistItemPreview item={selectedItem} />
          </div>
        </div>
      </div>
    </ViewPlaylistShell>
  );
}
