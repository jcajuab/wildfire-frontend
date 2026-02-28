"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  createAuthChallenge,
  fetchSignedManifest,
  postSignedHeartbeat,
  verifyAuthChallenge,
  type DisplayManifest,
} from "@/lib/display-api/client";
import { getStoredDisplayKeyPair, signText } from "@/lib/crypto/key-manager";
import { createSignedHeaders } from "@/lib/crypto/request-signer";
import {
  type DisplayRegistrationRecord,
  getDisplayRegistrationBySlug,
} from "@/lib/display-identity/registration-store";
import { createPlayerController } from "@/lib/display-runtime/player-controller";
import { buildRuntimeTimings } from "@/lib/display-runtime/overflow-timing";
import { PdfRenderer } from "@/lib/display-runtime/pdf-renderer";
import { createDisplaySseClient } from "@/lib/display-runtime/sse-client";

const POLL_MS = 60_000;
const HEARTBEAT_MS = 30_000;
const DEFAULT_SCROLL_PX_PER_SECOND = 24;

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const createChallengePayload = (input: {
  challengeToken: string;
  displaySlug: string;
  keyId: string;
}): string =>
  ["CHALLENGE", input.challengeToken, input.displaySlug, input.keyId].join(
    "\n",
  );

export default function DisplayRuntimePage() {
  const params = useParams<{ displaySlug: string }>();
  const displaySlug = params.displaySlug;
  const registration = useMemo<DisplayRegistrationRecord | null>(() => {
    if (!displaySlug) {
      return null;
    }
    return getDisplayRegistrationBySlug(displaySlug);
  }, [displaySlug]);
  const [manifest, setManifest] = useState<DisplayManifest | null>(null);
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
  const currentItem = manifest?.items[currentIndex] ?? null;
  const scrollPxPerSecond =
    manifest?.runtimeSettings.scrollPxPerSecond ?? DEFAULT_SCROLL_PX_PER_SECOND;
  const baseUrl = getBaseUrl();
  const staticConfigError = baseUrl ? null : "API URL is not configured.";

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
    if (!registration) {
      return;
    }

    if (!baseUrl) {
      return;
    }

    let disposed = false;

    const refreshManifest = async (privateKey: CryptoKey): Promise<void> => {
      const payload = await fetchSignedManifest({
        registration,
        privateKey,
      });
      const hasMaterialChange =
        payload.playlistVersion !== lastPlaylistVersionRef.current;
      setManifest(payload);
      setErrorMessage(null);
      if (hasMaterialChange) {
        setCurrentIndex(0);
        setMeasuredHeightByItemId({});
      }
      lastPlaylistVersionRef.current = payload.playlistVersion;
    };

    const connectRuntime = async (): Promise<(() => void) | null> => {
      const keyPair = await getStoredDisplayKeyPair(registration.keyAlias);
      if (!keyPair) {
        throw new Error(
          "Display keypair is unavailable. Re-register this display from /displays/register.",
        );
      }

      const challenge = await createAuthChallenge({
        displaySlug: registration.displaySlug,
        keyId: registration.keyId,
      });
      const challengePayload = createChallengePayload({
        challengeToken: challenge.challengeToken,
        displaySlug: registration.displaySlug,
        keyId: registration.keyId,
      });
      const challengeSignature = await signText(
        keyPair.privateKey,
        challengePayload,
      );
      await verifyAuthChallenge({
        challengeToken: challenge.challengeToken,
        displaySlug: registration.displaySlug,
        keyId: registration.keyId,
        signature: challengeSignature,
      });

      await refreshManifest(keyPair.privateKey);

      const streamUrl = `${baseUrl}/display/${encodeURIComponent(
        registration.displaySlug,
      )}/stream`;

      const sse = createDisplaySseClient({
        streamUrl,
        getHeaders: () =>
          createSignedHeaders({
            method: "GET",
            url: streamUrl,
            displaySlug: registration.displaySlug,
            keyId: registration.keyId,
            privateKey: keyPair.privateKey,
            body: "",
          }),
        onStateChange: setConnectionState,
        onEvent: () => {
          setLastEventAt(new Date().toISOString());
          void refreshManifest(keyPair.privateKey).catch((error) => {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Failed to refresh manifest",
            );
          });
        },
      });

      const pollTimer = setInterval(() => {
        void refreshManifest(keyPair.privateKey).catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to poll manifest",
          );
        });
      }, POLL_MS);

      const heartbeatTimer = setInterval(() => {
        void postSignedHeartbeat({
          registration,
          privateKey: keyPair.privateKey,
        }).catch(() => {
          // Heartbeat failures are non-fatal; manifest polling still runs.
        });
      }, HEARTBEAT_MS);

      return () => {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        sse.close();
      };
    };

    let cleanup: (() => void) | null = null;

    void connectRuntime()
      .then((fn) => {
        if (disposed) {
          fn?.();
          return;
        }
        cleanup = fn;
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error ? error.message : "Runtime startup failed",
        );
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [baseUrl, registration]);

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

  if (!registration) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-4 text-white">
        <p className="text-sm text-white/80">
          This display slug is not registered on this display.
        </p>
        <Link className="underline" href="/displays/register">
          Open /displays/register to complete registration
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs">
        {connectionState}
        {lastEventAt ? ` • ${new Date(lastEventAt).toLocaleTimeString()}` : ""}
      </div>
      {staticConfigError || errorMessage ? (
        <div className="absolute right-2 top-2 z-10 rounded bg-destructive/85 px-2 py-1 text-xs text-destructive-foreground">
          {staticConfigError ?? errorMessage}
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
        <div className="pointer-events-none h-screen w-screen overflow-hidden select-none">
          <Image
            key={currentItem.id}
            src={currentItem.content.downloadUrl}
            alt="Display content image"
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
