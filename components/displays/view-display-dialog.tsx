"use client";

import {
  IconDeviceDesktop,
  IconMapPin,
  IconPencil,
  IconPlayerPause,
} from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Display } from "@/types/display";

interface ViewDisplayDialogProps {
  readonly display: Display | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit: (display: Display) => void;
  readonly onEditPlaylist: (display: Display) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ViewDisplayDialog({
  display,
  open,
  onOpenChange,
  onEdit,
  onEditPlaylist,
}: ViewDisplayDialogProps): React.ReactElement | null {
  if (!display) return null;

  const nowPlaying = display.nowPlaying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>View Details</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="playlist">Playlist</TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="mt-4">
            <div className="flex flex-col gap-4">
              {/* Display info header */}
              <div className="flex items-start gap-2">
                <IconDeviceDesktop className="mt-0.5 size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{display.name}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IconMapPin className="size-3" />
                    {display.location}
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">IP Address:</span>
                <span>{display.ipAddress}</span>

                <span className="text-muted-foreground">MAC Address:</span>
                <span>{display.macAddress}</span>

                <span className="text-muted-foreground">Display Output:</span>
                <span>{display.displayOutput}</span>

                <span className="text-muted-foreground">Display Groups:</span>
                <div className="flex flex-wrap gap-1">
                  {display.groups.length > 0 ? (
                    display.groups.map((group) => (
                      <Badge
                        key={group}
                        variant="secondary"
                        className="text-xs"
                      >
                        {group}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => onEdit(display)}>
                <IconPencil className="size-4" />
                Edit
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Playlist Tab */}
          <TabsContent value="playlist" className="mt-4">
            <div className="flex flex-col gap-4">
              {/* Currently Playing */}
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Currently Playing
                </p>
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                    <IconPlayerPause className="size-5 text-muted-foreground" />
                  </div>
                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium">
                      {nowPlaying?.title ?? "N/A"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      From playlist: {nowPlaying?.playlist ?? "N/A"}
                    </p>
                  </div>
                  {/* Duration */}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {nowPlaying ? formatDuration(nowPlaying.progress) : "0:00"}
                  </span>
                </div>
              </div>

              {/* Current Playlist */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current Playlist
                </p>
                <div className="rounded-lg border p-3">
                  <p className="text-sm">{nowPlaying?.playlist ?? "N/A"}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 sm:justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => onEditPlaylist(display)}>
                <IconPencil className="size-4" />
                Edit Playlist
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
