import { useEffect, useMemo, useRef, useState } from "react";
import type { DisplayManifest } from "@/lib/display-api/client";
import { createPlayerController } from "@/lib/display-runtime/player-controller";
import { buildRuntimeTimings } from "@/lib/display-runtime/overflow-timing";

export function useDisplayPlayback(
  manifest: DisplayManifest | null,
  playlistVersion: string | null,
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const lastPlaylistVersionRef = useRef(playlistVersion);

  const timings = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return buildRuntimeTimings({
      items: manifest.items,
    });
  }, [manifest]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (timings.length === 0) {
      return;
    }

    const versionChanged = playlistVersion !== lastPlaylistVersionRef.current;
    lastPlaylistVersionRef.current = playlistVersion;
    const startIndex = versionChanged
      ? 0
      : Math.min(currentIndexRef.current, timings.length - 1);

    if (versionChanged) {
      currentIndexRef.current = 0;
    }

    const controller = createPlayerController({
      timings,
      initialIndex: startIndex,
      onTick: ({ index }) => {
        currentIndexRef.current = index;
        setCurrentIndex(index);
      },
    });
    controller.start();
    return () => {
      controller.stop();
    };
  }, [timings, playlistVersion]);

  const currentItem = manifest?.items[currentIndex] ?? null;

  return { currentIndex, currentItem };
}
