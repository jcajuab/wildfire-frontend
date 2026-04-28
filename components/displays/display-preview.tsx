"use client";

import Image from "next/image";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { getBaseUrl } from "@/lib/api/base-query";
import { authFetch } from "@/lib/auth-session";

interface DisplayPreviewProps {
  readonly displayId: string;
  readonly displayName: string;
  readonly displayStatus?: string;
}

const REFRESH_MS = 30_000;

export function DisplayPreview({
  displayId,
  displayName,
  displayStatus,
}: DisplayPreviewProps): ReactElement {
  const isDown = displayStatus === "DOWN" || displayStatus === "PROCESSING";
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isDown);

  const endpointUrl = useMemo(() => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/displays/${encodeURIComponent(displayId)}/preview`;
  }, [displayId]);

  useEffect(() => {
    if (isDown) {
      setImageUrl(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let activeObjectUrl: string | null = null;

    const applyImage = (nextImageUrl: string | null) => {
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = nextImageUrl;
      setImageUrl(nextImageUrl);
    };

    let consecutiveFailures = 0;

    const fetchPreview = async () => {
      try {
        const response = await authFetch(endpointUrl, {
          method: "GET",
          cache: "no-store",
        });
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
      clearInterval(timer);
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [endpointUrl, isDown]);

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={`${displayName} live preview`}
        width={1280}
        height={720}
        className="h-full w-full object-cover"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
        Loading preview...
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
      Preview unavailable
    </div>
  );
}
