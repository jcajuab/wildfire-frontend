"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  createAuthChallenge,
  fetchSignedManifest,
  postSignedSnapshot,
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
import { formatTimeOfDay } from "@/lib/formatters";
import { useMounted } from "@/hooks/use-mounted";

const POLL_MS = 60_000;
const HEARTBEAT_MS = 30_000;
const SNAPSHOT_UPLOAD_MS = 10_000;
const DEFAULT_SCROLL_PX_PER_SECOND = 24;

type FlashTone = "INFO" | "WARNING" | "CRITICAL";

const FLASH_TONE_CLASSNAME: Record<FlashTone, string> = {
  INFO: "border-cyan-300/70 bg-cyan-900/70 text-cyan-50",
  WARNING: "border-amber-300/70 bg-amber-900/70 text-amber-50",
  CRITICAL: "border-red-300/70 bg-red-900/75 text-red-50",
};

const formatRuntimeTimestamp = (timestamp: string | null): string | null => {
  if (!timestamp) {
    return null;
  }
  return formatTimeOfDay(timestamp);
};

const getViewport = () => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

const createChallengePayload = (input: {
  challengeToken: string;
  slug: string;
  keyId: string;
}): string =>
  ["CHALLENGE", input.challengeToken, input.slug, input.keyId].join("\n");

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to read snapshot blob"));
    };
    reader.onerror = () => {
      reject(new Error("Failed to read snapshot blob"));
    };
    reader.readAsDataURL(blob);
  });

export default function DisplayRuntimePage() {
  const params = useParams<{ displaySlug: string }>();
  const displaySlug = params.displaySlug;
  const isMounted = useMounted();
  const isRegistrationResolved = isMounted || !displaySlug;
  const registration = useMemo<DisplayRegistrationRecord | null>(() => {
    if (!isMounted || !displaySlug) {
      return null;
    }
    return getDisplayRegistrationBySlug(displaySlug);
  }, [displaySlug, isMounted]);
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
  const [isScrollAnimationActive, setIsScrollAnimationActive] = useState(false);

  const lastPlaylistVersionRef = useRef<string | null>(null);
  const manifestRef = useRef<DisplayManifest | null>(null);
  const currentIndexRef = useRef(0);
  const snapshotUploadingRef = useRef(false);
  const currentItem = manifest?.items[currentIndex] ?? null;
  const playback = manifest?.playback ?? null;
  const emergencyPlayback = playback?.emergency ?? null;
  const isEmergencyModeActive = playback?.mode === "EMERGENCY";
  const activeFlash = playback?.mode === "SCHEDULE" ? playback.flash : null;
  const scrollPxPerSecond =
    manifest?.runtimeSettings.scrollPxPerSecond ?? DEFAULT_SCROLL_PX_PER_SECOND;
  const baseUrl = getBaseUrl();

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

  const currentOverflow = useMemo(() => {
    if (!currentItem) {
      return 0;
    }
    const measuredHeight = measuredHeightByItemId[currentItem.id];
    const scaledHeight =
      typeof measuredHeight === "number" && measuredHeight > 0
        ? measuredHeight
        : currentItem.content.width && currentItem.content.height
          ? (viewport.width / currentItem.content.width) *
            currentItem.content.height
          : 0;
    return Math.max(0, scaledHeight - viewport.height);
  }, [currentItem, measuredHeightByItemId, viewport]);

  useEffect(() => {
    setIsScrollAnimationActive(false);
    if (!currentItem || currentOverflow <= 0 || overflowExtraSeconds <= 0) {
      return;
    }
    const frameId = window.requestAnimationFrame(() => {
      setIsScrollAnimationActive(true);
    });
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentItem, currentOverflow, overflowExtraSeconds]);

  useEffect(() => {
    if (!registration) {
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
      manifestRef.current = payload;
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
          "Display keypair is unavailable. Re-register this display from /admin/displays/register.",
        );
      }

      const challenge = await createAuthChallenge({
        slug: registration.slug,
        keyId: registration.keyId,
      });
      const challengePayload = createChallengePayload({
        challengeToken: challenge.challengeToken,
        slug: registration.slug,
        keyId: registration.keyId,
      });
      const challengeSignature = await signText(
        keyPair.privateKey,
        challengePayload,
      );
      await verifyAuthChallenge({
        challengeToken: challenge.challengeToken,
        slug: registration.slug,
        keyId: registration.keyId,
        signature: challengeSignature,
      });

      await refreshManifest(keyPair.privateKey);

      const streamUrl = `${baseUrl}/display-runtime/${encodeURIComponent(
        registration.slug,
      )}/stream`;

      const sse = createDisplaySseClient({
        streamUrl,
        getHeaders: () =>
          createSignedHeaders({
            method: "GET",
            url: streamUrl,
            slug: registration.slug,
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

      const uploadSnapshot = async (): Promise<void> => {
        if (snapshotUploadingRef.current) {
          return;
        }
        const currentManifest = manifestRef.current;
        if (!currentManifest) {
          return;
        }
        const activeItem =
          currentManifest.items[currentIndexRef.current] ?? null;
        if (!activeItem) {
          return;
        }
        const snapshotSourceUrl =
          activeItem.content.type === "IMAGE"
            ? activeItem.content.downloadUrl
            : activeItem.content.thumbnailUrl;
        if (!snapshotSourceUrl) {
          return;
        }

        snapshotUploadingRef.current = true;
        try {
          const response = await fetch(snapshotSourceUrl, {
            method: "GET",
            cache: "no-store",
          });
          if (!response.ok) {
            return;
          }
          const blob = await response.blob();
          if (!blob.type.startsWith("image/")) {
            return;
          }
          const imageDataUrl = await blobToDataUrl(blob);
          await postSignedSnapshot({
            registration,
            privateKey: keyPair.privateKey,
            imageDataUrl,
          });
        } catch {
          // Snapshot failures are non-fatal; runtime playback should continue.
        } finally {
          snapshotUploadingRef.current = false;
        }
      };

      const snapshotTimer = setInterval(() => {
        void uploadSnapshot();
      }, SNAPSHOT_UPLOAD_MS);
      void uploadSnapshot();

      return () => {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        clearInterval(snapshotTimer);
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
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (timings.length === 0) {
      return;
    }

    const controller = createPlayerController({
      timings,
      initialIndex: Math.min(currentIndexRef.current, timings.length - 1),
      onTick: ({ index }) => {
        currentIndexRef.current = index;
        setCurrentIndex(index);
      },
    });
    controller.start();
    return () => {
      controller.stop();
    };
  }, [timings]);

  const scrollStyle = useMemo(() => {
    if (!currentItem) return undefined;
    if (currentOverflow <= 0 || overflowExtraSeconds <= 0) {
      return undefined;
    }

    if (!isScrollAnimationActive) {
      return {
        transform: "translateY(0px)",
        transition: "none",
        willChange: "transform",
      };
    }

    return {
      transform: `translateY(-${currentOverflow}px)`,
      transition: `transform ${overflowExtraSeconds}s linear`,
      willChange: "transform",
    };
  }, [
    currentItem,
    currentOverflow,
    overflowExtraSeconds,
    isScrollAnimationActive,
  ]);

  const flashMarqueeText = useMemo(() => {
    if (!activeFlash) {
      return null;
    }
    const toneLabel = activeFlash.tone.toUpperCase();
    return `${toneLabel} • ${activeFlash.message}`;
  }, [activeFlash]);

  const flashMarqueeStyle = useMemo(() => {
    if (!flashMarqueeText || !activeFlash) {
      return undefined;
    }
    const estimatedTrackWidthPx = Math.max(
      viewport.width * 2,
      flashMarqueeText.length * 22,
    );
    const durationSeconds = Math.max(
      8,
      Math.round(estimatedTrackWidthPx / activeFlash.speedPxPerSecond),
    );
    return {
      "--wildfire-flash-duration": `${durationSeconds}s`,
      height: `${activeFlash.heightPx}px`,
    } as CSSProperties;
  }, [activeFlash, flashMarqueeText, viewport.width]);

  if (!isRegistrationResolved) {
    return (
      <main className="relative min-h-screen bg-black text-white">
        <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs">
          Initializing display
        </div>
      </main>
    );
  }

  if (!registration) {
    return (
      <main className="relative min-h-screen bg-black text-white">
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-4 text-white">
          <p className="text-sm text-white/80">
            This display slug is not registered on this display.
          </p>
          <Link className="underline" href="/admin/displays/register">
            Open /admin/displays/register to complete registration
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-black text-white">
      <div className="absolute left-2 top-2 z-10 rounded bg-black/60 px-2 py-1 text-xs">
        {connectionState}
        {lastEventAt ? ` • ${formatTimeOfDay(lastEventAt)}` : ""}
      </div>
      {errorMessage ? (
        <div className="absolute right-2 top-2 z-10 rounded bg-destructive/85 px-2 py-1 text-xs text-destructive-foreground">
          {errorMessage}
        </div>
      ) : null}
      {isEmergencyModeActive && emergencyPlayback ? (
        <div
          className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-md border border-red-300/80 bg-red-950/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-50 shadow-lg"
          role="status"
          aria-live="assertive"
        >
          Emergency Active
          <span className="ml-2 font-normal normal-case text-red-100">
            {emergencyPlayback.isGlobal ? "Global" : "Local"}
            {emergencyPlayback.startedAt
              ? ` • ${formatRuntimeTimestamp(emergencyPlayback.startedAt)}`
              : ""}
          </span>
        </div>
      ) : null}

      {!currentItem ? (
        <div className="h-screen w-screen bg-black" aria-hidden="true" />
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
      {activeFlash && flashMarqueeText ? (
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 border-b px-3 ${FLASH_TONE_CLASSNAME[activeFlash.tone]}`}
          role="status"
          aria-live={activeFlash.tone === "CRITICAL" ? "assertive" : "polite"}
          aria-label={`${activeFlash.tone} flash message`}
          style={flashMarqueeStyle}
        >
          <div className="relative flex h-full items-center overflow-hidden whitespace-nowrap">
            <div className="flex min-w-max items-center gap-10 pr-10 text-sm font-semibold tracking-wide [animation:flash-marquee_var(--wildfire-flash-duration)_linear_infinite] motion-reduce:[animation:none]">
              <span>{flashMarqueeText}</span>
              <span aria-hidden="true">{flashMarqueeText}</span>
              <span aria-hidden="true">{flashMarqueeText}</span>
            </div>
          </div>
        </div>
      ) : null}
      <style jsx>{`
        @keyframes flash-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-33.33%);
          }
        }
      `}</style>
    </main>
  );
}
