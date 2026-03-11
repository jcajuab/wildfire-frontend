"use client";

import Image from "next/image";
import { type ReactElement, useEffect, useMemo, useState } from "react";
import { getBaseUrl } from "@/lib/api/base-query";

interface DisplayPreviewProps {
  readonly displayId: string;
  readonly displayName: string;
}

const REFRESH_MS = 10_000;

export function DisplayPreview({
  displayId,
  displayName,
}: DisplayPreviewProps): ReactElement {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const endpointUrl = useMemo(() => {
    const baseUrl = getBaseUrl();
    return `${baseUrl}/displays/${encodeURIComponent(displayId)}/preview`;
  }, [displayId]);

  useEffect(() => {
    let cancelled = false;
    let activeObjectUrl: string | null = null;

    const applyImage = (nextImageUrl: string | null) => {
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = nextImageUrl;
      setImageUrl(nextImageUrl);
    };

    const fetchPreview = async () => {
      try {
        const response = await fetch(endpointUrl, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) {
          return;
        }

        if (response.status === 204 || !response.ok) {
          applyImage(null);
          return;
        }

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
      void fetchPreview();
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
    };
  }, [endpointUrl]);

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={`${displayName} live preview`}
        unoptimized={true}
        width={1280}
        height={720}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
      {isLoading ? "Loading preview..." : "No content scheduled"}
    </div>
  );
}
