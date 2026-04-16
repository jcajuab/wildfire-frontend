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
import { createScheduleBoundaryTimer } from "@/lib/display-runtime/schedule-timer";
import { createDisplaySseClient } from "@/lib/display-runtime/sse-client";
import { useMounted } from "@/hooks/use-mounted";

const FALLBACK_POLL_MS = 300_000;
const HEARTBEAT_MS = 30_000;

const createChallengePayload = (input: {
  challengeToken: string;
  slug: string;
  keyId: string;
}): string =>
  ["CHALLENGE", input.challengeToken, input.slug, input.keyId].join("\n");

export function useDisplayRuntime(displaySlug: string) {
  const isMounted = useMounted();
  const isRegistrationResolved = isMounted || !displaySlug;
  const registration = useMemo<DisplayRegistrationRecord | null>(() => {
    if (!isMounted || !displaySlug) {
      return null;
    }
    return getDisplayRegistrationBySlug(displaySlug);
  }, [displaySlug, isMounted]);

  const [manifest, setManifest] = useState<DisplayManifest | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connected" | "reconnecting" | "closed"
  >("closed");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [playlistVersion, setPlaylistVersion] = useState<string | null>(null);

  const lastPlaylistVersionRef = useRef<string | null>(null);
  const manifestRef = useRef<DisplayManifest | null>(null);
  const baseUrl = getBaseUrl();

  useEffect(() => {
    if (!registration) {
      return;
    }

    let disposed = false;

    const refreshManifest = async (privateKey: CryptoKey): Promise<void> => {
      const result = await fetchSignedManifest({
        registration,
        privateKey,
        ifNoneMatch: lastPlaylistVersionRef.current,
      });
      if (result.kind === "not-modified") {
        setErrorMessage(null);
        if (result.playlistVersion) {
          lastPlaylistVersionRef.current = result.playlistVersion;
        }
        return;
      }
      const payload = result.manifest;
      const hasMaterialChange =
        payload.playlistVersion !== lastPlaylistVersionRef.current;
      setManifest(payload);
      manifestRef.current = payload;
      setErrorMessage(null);
      if (hasMaterialChange) {
        setPlaylistVersion(payload.playlistVersion);
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
      let latestConnectionState: "connected" | "reconnecting" | "closed" =
        "closed";

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
        onStateChange: (nextState) => {
          latestConnectionState = nextState;
          setConnectionState(nextState);
        },
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
        if (latestConnectionState === "connected") {
          return;
        }
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

      return () => {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
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

  return {
    manifest,
    connectionState,
    errorMessage,
    lastEventAt,
    registration,
    isRegistrationResolved,
    playlistVersion,
  };
}
