"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import { createPlayerController } from "@/lib/device-runtime/player-controller";
import {
  buildRuntimeTimings,
  type RuntimeManifestItem,
} from "@/lib/device-runtime/overflow-timing";
import { PdfRenderer } from "@/lib/device-runtime/pdf-renderer";
import { createDeviceSseClient } from "@/lib/device-runtime/sse-client";

interface DeviceManifest {
  readonly playlistId: string | null;
  readonly playlistVersion: string;
  readonly generatedAt: string;
  readonly runtimeSettings: {
    readonly scrollPxPerSecond: number;
  };
  readonly items: readonly RuntimeManifestItemWithContent[];
}

interface RuntimeManifestItemWithContent extends RuntimeManifestItem {
  readonly content: RuntimeManifestItem["content"] & {
    readonly id: string;
    readonly downloadUrl: string;
    readonly mimeType: string;
  };
}

interface StreamTokenResponse {
  readonly token: string;
  readonly expiresAt: string;
}

const POLL_MS = 60_000;
const DEFAULT_SCROLL_PX_PER_SECOND = 24;

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

function createDisplayRuntimeApi(input: {
  baseUrl: string;
  displayId: string;
  headers: Record<string, string>;
}) {
  return {
    async fetchManifest(): Promise<DeviceManifest> {
      const response = await fetch(
        `${input.baseUrl}/displays/${input.displayId}/manifest`,
        { headers: input.headers },
      );
      if (!response.ok) {
        throw new Error(`Manifest fetch failed (${response.status})`);
      }
      return (await response.json()) as DeviceManifest;
    },
    async fetchStreamToken(): Promise<StreamTokenResponse> {
      const response = await fetch(
        `${input.baseUrl}/displays/${input.displayId}/stream-token`,
        {
          headers: input.headers,
        },
      );
      if (!response.ok) {
        throw new Error(`Stream token request failed (${response.status})`);
      }
      return (await response.json()) as StreamTokenResponse;
    },
  };
}

export default function DisplayRuntimePage() {
  const params = useParams<{ displayId: string }>();
  const searchParams = useSearchParams();
  const displayId = params.displayId;
  const apiKey = searchParams.get("apiKey") ?? "";
  const [manifest, setManifest] = useState<DeviceManifest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionState, setConnectionState] = useState<
    "connected" | "reconnecting" | "closed"
  >("closed");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });
  const [measuredHeightByItemId, setMeasuredHeightByItemId] = useState<
    Record<string, number>
  >({});

  const lastPlaylistVersionRef = useRef<string | null>(null);

  const baseUrl = getBaseUrl();
  const currentItem = manifest?.items[currentIndex] ?? null;
  const scrollPxPerSecond =
    manifest?.runtimeSettings.scrollPxPerSecond ?? DEFAULT_SCROLL_PX_PER_SECOND;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const applyViewport = () => setViewport(getViewport());
    applyViewport();
    window.addEventListener("resize", applyViewport);
    return () => {
      window.removeEventListener("resize", applyViewport);
    };
  }, []);

  const timings = useMemo(() => {
    if (!manifest) {
      return [];
    }
    return buildRuntimeTimings({
      items: manifest.items,
      viewport,
      config: { scrollPixelsPerSecond: scrollPxPerSecond },
      measuredHeightByItemId,
    });
  }, [manifest, measuredHeightByItemId, scrollPxPerSecond, viewport]);

  const currentTiming = timings[currentIndex] ?? null;
  const overflowExtraSeconds = currentTiming?.overflowExtraSeconds ?? 0;

  useEffect(() => {
    if (!displayId || !apiKey || !baseUrl) {
      return;
    }

    const commonHeaders = {
      ...getDevOnlyRequestHeaders(),
      "x-api-key": apiKey,
    };
    const api = createDisplayRuntimeApi({
      baseUrl,
      displayId,
      headers: commonHeaders,
    });
    let disposed = false;

    const refreshManifest = async (): Promise<void> => {
      const payload = await api.fetchManifest();
      const hasMaterialChange = payload.playlistVersion !== lastPlaylistVersionRef.current;
      setManifest(payload);
      if (hasMaterialChange) {
        setCurrentIndex(0);
        setMeasuredHeightByItemId({});
      }
      lastPlaylistVersionRef.current = payload.playlistVersion;
    };

    void refreshManifest().catch((error) => {
      if (!disposed) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load manifest",
        );
      }
    });

    const sse = createDeviceSseClient({
      streamUrl: `${baseUrl}/displays/${displayId}/stream`,
      getToken: api.fetchStreamToken,
      onStateChange: setConnectionState,
      onEvent: () => {
        setLastEventAt(new Date().toISOString());
        void refreshManifest().catch((error) => {
          if (!disposed) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Failed to refresh manifest",
            );
          }
        });
      },
    });

    const pollTimer = setInterval(() => {
      void refreshManifest().catch(() => undefined);
    }, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
      sse.close();
    };
  }, [apiKey, baseUrl, displayId]);

  useEffect(() => {
    if (timings.length === 0) {
      return;
    }
    const controller = createPlayerController({
      timings,
      initialIndex: currentIndex,
      onTick: ({ index }) => setCurrentIndex(index),
    });
    controller.start();
    return () => {
      controller.stop();
    };
  }, [currentIndex, timings]);

  const scrollStyle = useMemo(() => {
    if (!currentItem) return undefined;
    const measuredHeight = measuredHeightByItemId[currentItem.id];
    const scaledHeight =
      typeof measuredHeight === "number" && measuredHeight > 0
        ? measuredHeight
        : currentItem.content.width && currentItem.content.height
          ? (viewport.width / currentItem.content.width) *
            currentItem.content.height
          : 0;
    const overflow = Math.max(0, scaledHeight - viewport.height);
    if (overflow <= 0 || overflowExtraSeconds <= 0) {
      return undefined;
    }
    return {
      transform: `translateY(-${overflow}px)`,
      transition: `transform ${overflowExtraSeconds}s linear`,
      willChange: "transform",
    };
  }, [currentItem, measuredHeightByItemId, overflowExtraSeconds, viewport]);

  if (!baseUrl || !displayId || !apiKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Runtime requires `displayId` route and `apiKey` query parameter.
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs">
        {connectionState}
        {lastEventAt ? ` • ${new Date(lastEventAt).toLocaleTimeString()}` : ""}
      </div>
      {errorMessage ? (
        <div className="absolute right-2 top-2 z-10 rounded bg-destructive/85 px-2 py-1 text-xs text-destructive-foreground">
          {errorMessage}
        </div>
      ) : null}

      {!currentItem ? (
        <div className="flex min-h-screen items-center justify-center text-sm text-white/70">
          No active schedule
        </div>
      ) : currentItem.content.type === "VIDEO" ? (
        <video
          key={currentItem.id}
          src={currentItem.content.downloadUrl}
          className="h-screen w-screen object-contain"
          autoPlay
          muted
          playsInline
        />
      ) : currentItem.content.type === "IMAGE" ? (
        <div className="h-screen w-screen overflow-hidden select-none pointer-events-none">
          <Image
            key={currentItem.id}
            src={currentItem.content.downloadUrl}
            alt=""
            width={currentItem.content.width ?? viewport.width}
            height={currentItem.content.height ?? viewport.height}
            className="h-auto w-full"
            style={scrollStyle}
            unoptimized
          />
        </div>
      ) : (
        <div className="h-screen w-screen overflow-hidden bg-white">
          <div style={scrollStyle}>
            <PdfRenderer
              key={currentItem.id}
              src={currentItem.content.downloadUrl}
              viewportWidth={viewport.width}
              onMeasuredHeight={(height) =>
                setMeasuredHeightByItemId((prev) =>
                  prev[currentItem.id] === height
                    ? prev
                    : { ...prev, [currentItem.id]: height },
                )
              }
            />
          </div>
        </div>
      )}
    </main>
  );
}

