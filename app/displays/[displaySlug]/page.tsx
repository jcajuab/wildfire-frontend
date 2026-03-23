"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  buildFlashMarqueeStyle,
  getFlashBadgeClassName,
  getFlashMarqueeMessage,
  inferFlashRepeatCount,
} from "@/lib/display-runtime/flash-ticker";
import { formatTimeOfDay } from "@/lib/formatters";
import { BouncingLogoScreensaver } from "@/components/displays/bouncing-logo-screensaver";
import { DisplayTextContent } from "@/components/displays/display-text-content";
import { useDisplayRuntime } from "./_hooks/use-display-runtime";
import { useDisplayPlayback } from "./_hooks/use-display-playback";
import { useSnapshotUploader } from "./_hooks/use-snapshot-uploader";

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

  const {
    manifest,
    connectionState,
    errorMessage,
    lastEventAt,
    registration,
    isRegistrationResolved,
    playlistVersion,
  } = useDisplayRuntime(displaySlug);

  const { currentIndex, currentItem } = useDisplayPlayback(
    manifest,
    playlistVersion,
  );

  useSnapshotUploader(manifest, currentIndex, registration);

  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const applyViewport = () => setViewport(getViewport());
    applyViewport();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedApplyViewport = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyViewport, 150);
    };
    window.addEventListener("resize", debouncedApplyViewport);
    return () => {
      window.removeEventListener("resize", debouncedApplyViewport);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const playback = manifest?.playback ?? null;
  const emergencyPlayback = playback?.emergency ?? null;
  const isEmergencyModeActive = playback?.mode === "EMERGENCY";
  const activeFlash = playback?.mode === "SCHEDULE" ? playback.flash : null;

  const tableStyle = useMemo(() => {
    if (currentItem?.content.type !== "TEXT") return null;
    return computeTableFontSize(
      currentItem.content.textHtmlContent ?? "",
      viewport.height,
    );
  }, [currentItem, viewport.height]);

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
      <h1 className="sr-only">Display content</h1>
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
            />
          </div>
        ) : currentItem.content.type === "TEXT" ? (
          <DisplayTextContent
            key={currentItem.id}
            html={currentItem.content.textHtmlContent ?? ""}
          />
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
