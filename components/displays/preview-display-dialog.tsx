"use client";

import type { ReactElement } from "react";
import { IconPlayerPause } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Display } from "@/types/display";

interface PreviewDisplayDialogProps {
  readonly display: Display | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PreviewDisplayDialog({
  display,
  open,
  onOpenChange,
}: PreviewDisplayDialogProps): ReactElement | null {
  if (!display) return null;
  const nowPlaying = display.nowPlaying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preview Page</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Currently Playing
            </p>
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded bg-muted">
                <IconPlayerPause className="size-5 text-muted-foreground" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-medium">
                  {nowPlaying?.title ?? "N/A"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  From playlist: {nowPlaying?.playlist ?? "N/A"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {nowPlaying ? formatDuration(nowPlaying.progress) : "0:00"}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Current playlist</p>
            <p className="text-sm font-medium">
              {nowPlaying?.playlist ?? "N/A"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
