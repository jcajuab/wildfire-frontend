import { useEffect, useRef } from "react";
import type { DisplayManifest } from "@/lib/display-api/client";
import { postSignedSnapshot } from "@/lib/display-api/client";
import { getStoredDisplayKeyPair } from "@/lib/crypto/key-manager";
import type { DisplayRegistrationRecord } from "@/lib/display-identity/registration-store";

const SNAPSHOT_UPLOAD_MS = 10_000;

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

export function useSnapshotUploader(
  manifest: DisplayManifest | null,
  currentIndex: number,
  registration: DisplayRegistrationRecord | null,
) {
  const snapshotUploadingRef = useRef(false);
  const lastSnapshotUrlRef = useRef<string | null>(null);
  const manifestRef = useRef(manifest);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!registration) {
      return;
    }

    const uploadSnapshot = async (): Promise<void> => {
      if (snapshotUploadingRef.current) {
        return;
      }
      const currentManifest = manifestRef.current;
      if (!currentManifest) {
        return;
      }
      const activeItem = currentManifest.items[currentIndexRef.current] ?? null;
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
      if (snapshotSourceUrl === lastSnapshotUrlRef.current) {
        return;
      }

      const keyPair = await getStoredDisplayKeyPair(registration.keyAlias);
      if (!keyPair) {
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
        lastSnapshotUrlRef.current = snapshotSourceUrl;
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
      clearInterval(snapshotTimer);
    };
  }, [registration]);
}
