"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBaseUrl } from "@/lib/api/base-query";
import { sanitizeRichTextHtml } from "@/lib/content-thumbnail-preview";
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
import { createScheduleBoundaryTimer } from "@/lib/display-runtime/schedule-timer";
import { buildRuntimeTimings } from "@/lib/display-runtime/overflow-timing";
import { createDisplaySseClient } from "@/lib/display-runtime/sse-client";
import {
  buildFlashMarqueeStyle,
  getFlashBadgeClassName,
  getFlashMarqueeMessage,
  inferFlashRepeatCount,
} from "@/lib/display-runtime/flash-ticker";
import { formatTimeOfDay } from "@/lib/formatters";
import { useMounted } from "@/hooks/use-mounted";
import { BouncingLogoScreensaver } from "@/components/displays/bouncing-logo-screensaver";

const FALLBACK_POLL_MS = 300_000;
const HEARTBEAT_MS = 30_000;
const SNAPSHOT_UPLOAD_MS = 10_000;

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

function computeTableFontSize(
  html: string,
  viewportHeight: number,
): { fontSize: number; cellPaddingV: number; cellPaddingH: number } | null {
  if (!html.includes("<table")) return null;

  const firstRowContent = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i)?.[1] ?? "";
  const colCount = (firstRowContent.match(/<(th|td)/gi) ?? []).length;

  let fontSize =
    colCount <= 2 ? 36 : colCount <= 4 ? 24 : colCount <= 6 ? 18 : 14;

  const rowCount = (html.match(/<tr[^>]/gi) ?? []).length;
  const availableHeight = viewportHeight - 64;
  const MIN_FONT = 10;

  while (fontSize > MIN_FONT) {
    const cellPaddingV = Math.max(4, Math.round(fontSize * 0.4));
    const estimatedRowHeight = cellPaddingV * 2 + fontSize * 1.5;
    if (rowCount * estimatedRowHeight <= availableHeight) break;
    fontSize -= 2;
  }

  return {
    fontSize,
    cellPaddingV: Math.max(4, Math.round(fontSize * 0.4)),
    cellPaddingH: Math.max(8, Math.round(fontSize * 0.6)),
  };
}

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

  const lastPlaylistVersionRef = useRef<string | null>(null);
  const manifestRef = useRef<DisplayManifest | null>(null);
  const currentIndexRef = useRef(0);
  const snapshotUploadingRef = useRef(false);
  const currentItem = manifest?.items[currentIndex] ?? null;
  const playback = manifest?.playback ?? null;
  const emergencyPlayback = playback?.emergency ?? null;
  const isEmergencyModeActive = playback?.mode === "EMERGENCY";
  const activeFlash = playback?.mode === "SCHEDULE" ? playback.flash : null;
  const baseUrl = getBaseUrl();

  const tableStyle = useMemo(() => {
    if (currentItem?.content.type !== "TEXT") return null;
    return computeTableFontSize(
      currentItem.content.textHtmlContent ?? "",
      viewport.height,
    );
  }, [currentItem, viewport.height]);

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
    });
  }, [manifest]);

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

      let boundaryTimer: { clear(): void } | null = null;

      const restartBoundaryTimer = (): void => {
        boundaryTimer?.clear();
        const currentManifest = manifestRef.current;
        if (currentManifest) {
          boundaryTimer = createScheduleBoundaryTimer(
            currentManifest.schedules,
            () => {
              void refreshManifest(keyPair.privateKey)
                .then(() => {
                  restartBoundaryTimer();
                })
                .catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "Failed to refresh manifest at schedule boundary",
                  );
                });
            },
          );
        }
      };

      restartBoundaryTimer();

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
          void refreshManifest(keyPair.privateKey)
            .then(() => {
              restartBoundaryTimer();
            })
            .catch((error) => {
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
      }, FALLBACK_POLL_MS);

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
        boundaryTimer?.clear();
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

  const flashMarqueeText = useMemo(() => {
    if (!activeFlash) {
      return null;
    }
    return getFlashMarqueeMessage(activeFlash.message);
  }, [activeFlash]);

  const flashRepeatCount = useMemo(() => {
    if (!flashMarqueeText) {
      return 0;
    }
    return inferFlashRepeatCount({
      message: flashMarqueeText,
      containerWidthPx: viewport.width,
    });
  }, [flashMarqueeText, viewport.width]);

  const flashRepeatUnits = useMemo(
    () => Array.from({ length: flashRepeatCount }, (_, index) => index),
    [flashRepeatCount],
  );

  const flashMarqueeStyle = useMemo(() => {
    if (!flashMarqueeText || !activeFlash) {
      return undefined;
    }
    return buildFlashMarqueeStyle({
      message: flashMarqueeText,
      heightPx: activeFlash.heightPx,
      speedPxPerSecond: activeFlash.speedPxPerSecond,
      repeatCount: flashRepeatCount,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    });
  }, [
    activeFlash,
    flashMarqueeText,
    flashRepeatCount,
    viewport.height,
    viewport.width,
  ]);

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
    <main className="relative flex h-screen min-h-screen flex-col overflow-hidden bg-black text-white">
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
      {activeFlash && flashMarqueeText ? (
        <div
          className="pointer-events-none relative z-20 shrink-0 overflow-hidden bg-white shadow-[0_8px_20px_rgba(0,0,0,0.28)]"
          role="status"
          aria-live={activeFlash.tone === "CRITICAL" ? "assertive" : "polite"}
          aria-label={`${activeFlash.tone} flash message`}
          style={flashMarqueeStyle}
        >
          <div className="flex h-full items-stretch">
            <div
              className={`flex h-full shrink-0 items-center justify-center px-6 text-lg font-extrabold leading-none tracking-[0.16em] ${getFlashBadgeClassName(
                activeFlash.tone,
              )}`}
            >
              {activeFlash.tone}
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden bg-white text-black">
              <div
                aria-hidden="true"
                className="absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-black/25 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-black/25 to-transparent"
              />
              <div className="flex h-full min-w-max items-center whitespace-nowrap [animation:flash-marquee_var(--wildfire-flash-duration)_linear_infinite] motion-reduce:[animation:none]">
                {[0, 1].map((groupIndex) => (
                  <div key={groupIndex} className="flex shrink-0 items-center">
                    {flashRepeatUnits.map((unitIndex) => (
                      <span
                        key={`${groupIndex}-${unitIndex}`}
                        aria-hidden={groupIndex > 0 || unitIndex > 0}
                        className="pr-10 text-lg font-semibold leading-none tracking-wide"
                      >
                        {flashMarqueeText}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div className="relative flex-1 min-h-0">
        {!currentItem ? (
          <BouncingLogoScreensaver />
        ) : currentItem.content.type === "VIDEO" ? (
          <div className="h-full w-full overflow-hidden bg-black">
            <video
              key={currentItem.id}
              src={currentItem.content.downloadUrl}
              className="h-full w-full object-contain"
              autoPlay
              muted
              playsInline
            />
          </div>
        ) : currentItem.content.type === "IMAGE" ? (
          <div className="pointer-events-none relative h-full w-full overflow-hidden bg-black select-none">
            <Image
              key={currentItem.id}
              src={currentItem.content.downloadUrl}
              alt="Display content image"
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </div>
        ) : currentItem.content.type === "TEXT" ? (
          <div className="flex h-full w-full items-start overflow-hidden bg-white p-8">
            <div
              key={currentItem.id}
              className="display-text-table w-full text-4xl leading-relaxed text-black [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:italic [&_li]:list-item [&_ol]:list-decimal [&_ol]:pl-[1.5em] [&_p]:my-2 [&_strong]:font-bold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-[1.5em] [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-100 [&_th]:font-bold"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichTextHtml(
                  currentItem.content.textHtmlContent ?? "",
                ),
              }}
            />
          </div>
        ) : null}
      </div>
      <style jsx>{`
        @keyframes flash-marquee {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
        ${tableStyle
          ? `
        .display-text-table table {
          font-size: ${tableStyle.fontSize}px;
          line-height: 1.4;
          width: 100%;
          border-collapse: collapse;
        }
        .display-text-table th,
        .display-text-table td {
          padding: ${tableStyle.cellPaddingV}px ${tableStyle.cellPaddingH}px;
        }
        `
          : ""}
      `}</style>
    </main>
  );
}
