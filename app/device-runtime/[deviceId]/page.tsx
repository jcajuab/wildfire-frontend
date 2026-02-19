"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import { createPlayerController } from "@/lib/device-runtime/player-controller";
import {
  buildRuntimeTimings,
  computeOverflowExtraSeconds,
  type RuntimeManifestItem,
} from "@/lib/device-runtime/overflow-timing";
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

const POLL_MS = 60_000;
const DEFAULT_SCROLL_PX_PER_SECOND = 24;

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

export default function DeviceRuntimePage() {
  const params = useParams<{ deviceId: string }>();
  const searchParams = useSearchParams();
  const deviceId = params.deviceId;
  const apiKey = searchParams.get("apiKey") ?? "";
  const [manifest, setManifest] = useState<DeviceManifest | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionState, setConnectionState] = useState<
    "connected" | "reconnecting" | "closed"
  >("closed");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseUrl = getBaseUrl();
  const currentItem = manifest?.items[currentIndex] ?? null;
  const scrollPxPerSecond =
    manifest?.runtimeSettings.scrollPxPerSecond ?? DEFAULT_SCROLL_PX_PER_SECOND;

  const timings = useMemo(() => {
    if (!manifest || typeof window === "undefined") {
      return [];
    }
    return buildRuntimeTimings({
      items: manifest.items,
      viewport: getViewport(),
      config: { scrollPixelsPerSecond: scrollPxPerSecond },
    });
  }, [manifest, scrollPxPerSecond]);

  useEffect(() => {
    if (!deviceId || !apiKey || !baseUrl) {
      return;
    }

    const commonHeaders = {
      ...getDevOnlyRequestHeaders(),
      "x-api-key": apiKey,
    };

    const fetchManifest = async (): Promise<void> => {
      const response = await fetch(`${baseUrl}/devices/${deviceId}/manifest`, {
        headers: commonHeaders,
      });
      if (!response.ok) {
        throw new Error(`Manifest fetch failed (${response.status})`);
      }
      const payload = (await response.json()) as DeviceManifest;
      setManifest(payload);
      setCurrentIndex(0);
    };

    const fetchStreamToken = async () => {
      const response = await fetch(
        `${baseUrl}/devices/${deviceId}/stream-token`,
        { headers: commonHeaders },
      );
      if (!response.ok) {
        throw new Error(`Stream token request failed (${response.status})`);
      }
      return (await response.json()) as { token: string; expiresAt: string };
    };

    let disposed = false;
    const start = async () => {
      try {
        await fetchManifest();
      } catch (error) {
        if (!disposed) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load manifest",
          );
        }
      }
    };
    void start();

    const sse = createDeviceSseClient({
      streamUrl: `${baseUrl}/devices/${deviceId}/stream`,
      getToken: fetchStreamToken,
      onStateChange: setConnectionState,
      onEvent: () => {
        setLastEventAt(new Date().toISOString());
        void fetchManifest().catch((error) => {
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
      void fetchManifest().catch(() => undefined);
    }, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(pollTimer);
      sse.close();
    };
  }, [apiKey, baseUrl, deviceId]);

  useEffect(() => {
    if (timings.length === 0) {
      return;
    }
    const controller = createPlayerController({
      timings,
      onTick: ({ index }) => setCurrentIndex(index),
    });
    controller.start();
    return () => {
      controller.stop();
    };
  }, [timings]);

  const overflowExtraSeconds =
    currentItem && typeof window !== "undefined"
      ? computeOverflowExtraSeconds({
          item: currentItem,
          viewport: getViewport(),
          config: { scrollPixelsPerSecond: scrollPxPerSecond },
        })
      : 0;

  const scrollStyle = useMemo(() => {
    if (!currentItem || typeof window === "undefined") return undefined;
    const width = currentItem.content.width ?? window.innerWidth;
    const height = currentItem.content.height ?? window.innerHeight;
    const scaledHeight = (window.innerWidth / width) * height;
    const overflow = Math.max(0, scaledHeight - window.innerHeight);
    if (overflow <= 0 || overflowExtraSeconds <= 0) {
      return undefined;
    }
    return {
      transform: `translateY(-${overflow}px)`,
      transition: `transform ${overflowExtraSeconds}s linear`,
    };
  }, [currentItem, overflowExtraSeconds]);

  if (!baseUrl || !deviceId || !apiKey) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Runtime requires `deviceId` route and `apiKey` query parameter.
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
        <div className="absolute right-2 top-2 z-10 rounded bg-red-600/80 px-2 py-1 text-xs">
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
        <div className="h-screen w-screen overflow-hidden">
          <Image
            key={currentItem.id}
            src={currentItem.content.downloadUrl}
            alt=""
            width={currentItem.content.width ?? window.innerWidth}
            height={currentItem.content.height ?? window.innerHeight}
            className="h-auto w-full"
            style={scrollStyle}
            unoptimized
          />
        </div>
      ) : (
        <div className="h-screen w-screen overflow-hidden" style={scrollStyle}>
          <iframe
            key={currentItem.id}
            src={currentItem.content.downloadUrl}
            className="h-full w-full border-0 bg-white"
            title="Device PDF content"
          />
        </div>
      )}
    </main>
  );
}
