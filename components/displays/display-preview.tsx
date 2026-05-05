"use client";

import Image from "next/image";
import {
  type ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBaseUrl } from "@/lib/api/base-query";
import { authFetch } from "@/lib/auth-session";

interface DisplayPreviewProps {
  readonly displayId: string;
  readonly displayName: string;
  readonly displayStatus?: string;
}

const REFRESH_MS = 30_000;
const MAX_CONCURRENT_PREVIEW_FETCHES = 3;

let activePreviewFetches = 0;
const pendingPreviewFetches: Array<() => void> = [];

function releasePreviewFetchSlot(): void {
  activePreviewFetches = Math.max(activePreviewFetches - 1, 0);
  pendingPreviewFetches.shift()?.();
}

function runQueuedPreviewFetch<T>(
  task: () => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<T>((resolve, reject) => {
    let started = false;
    let settled = false;

    const start = () => {
      if (settled) return;
      if (signal.aborted) {
        settled = true;
        reject(signal.reason);
        return;
      }

      started = true;
      activePreviewFetches++;
      task()
        .then(resolve, reject)
        .finally(() => {
          settled = true;
          releasePreviewFetchSlot();
        });
    };

    const handleAbort = () => {
      if (settled || started) return;
      settled = true;
      const pendingIndex = pendingPreviewFetches.indexOf(start);
      if (pendingIndex !== -1) {
        pendingPreviewFetches.splice(pendingIndex, 1);
      }
      reject(signal.reason);
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    if (activePreviewFetches < MAX_CONCURRENT_PREVIEW_FETCHES) {
      start();
    } else {
      pendingPreviewFetches.push(start);
    }
  });
}

export function DisplayPreview({
  displayId,
  displayName,
  displayStatus,
}: DisplayPreviewProps): ReactElement {
  const isDown = displayStatus === "DOWN" || displayStatus === "PROCESSING";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const endpointUrl = useMemo(() => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/displays/${encodeURIComponent(displayId)}/preview`;
  }, [displayId]);

  useEffect(() => {
    if (isDown) {
      setIsVisible(false);
      return;
    }

    const element = containerRef.current;
    if (element == null || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry?.isIntersecting ?? false);
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [isDown]);

  useEffect(() => {
    if (isDown || !isVisible) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let activeObjectUrl: string | null = null;
    const controller = new AbortController();

    const applyImage = (nextImageUrl: string | null) => {
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = nextImageUrl;
      setImageUrl(nextImageUrl);
    };

    let consecutiveFailures = 0;

    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        const response = await runQueuedPreviewFetch(
          () =>
            authFetch(endpointUrl, {
              method: "GET",
              cache: "no-store",
              signal: controller.signal,
            }),
          controller.signal,
        );
        if (cancelled) {
          return;
        }

        if (response.status === 204 || !response.ok) {
          consecutiveFailures++;
          applyImage(null);
          return;
        }

        consecutiveFailures = 0;
        const blob = await response.blob();
        if (cancelled) {
          return;
        }
        if (!blob.type.startsWith("image/")) {
          applyImage(null);
          return;
        }
        const nextObjectUrl = URL.createObjectURL(blob);
        applyImage(nextObjectUrl);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchPreview();
    const timer = setInterval(() => {
      // Back off when the preview is consistently unavailable.
      if (consecutiveFailures >= 3) {
        return;
      }
      void fetchPreview();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [endpointUrl, isDown, isVisible]);

  if (imageUrl) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <Image
          src={imageUrl}
          alt={`${displayName} live preview`}
          width={1280}
          height={720}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="flex h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground"
      >
        Loading preview...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground"
    >
      Preview unavailable
    </div>
  );
}
