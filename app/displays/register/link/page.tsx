"use client";

import type { ReactElement } from "react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  assertDisplayCryptoSupport,
  exportPublicKeyPem,
  getOrCreateDisplayKeyPair,
  signText,
} from "@/lib/crypto/key-manager";
import { deriveDisplayFingerprint } from "@/lib/display-identity/fingerprint";
import { saveDisplayRegistration } from "@/lib/display-identity/registration-store";
import {
  fetchRegistrationLinkMetadata,
  claimRegistrationLink,
} from "@/lib/display-api/client";

type RegistrationStatus =
  | { kind: "registering" }
  | { kind: "success"; slug: string }
  | { kind: "error"; message: string };

const REDIRECT_DELAY_MS = 2000;

function LinkRegistrationContent(): ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<RegistrationStatus>(() =>
    token
      ? { kind: "registering" }
      : { kind: "error", message: "No registration token provided." },
  );
  const hasStarted = useRef(false);

  const performRegistration = useCallback(
    async (registrationToken: string): Promise<void> => {
      try {
        assertDisplayCryptoSupport();
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Browser does not support required cryptographic features.",
        });
        return;
      }

      try {
        const metadata = await fetchRegistrationLinkMetadata(registrationToken);

        const keyAlias = `display-output:${metadata.output}`;
        const keyPair = await getOrCreateDisplayKeyPair(keyAlias);
        const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
        const fingerprint = await deriveDisplayFingerprint({
          output: metadata.output,
          publicKeyPem,
        });

        const registrationPayload = [
          "REGISTRATION",
          registrationToken,
          metadata.challengeNonce,
          metadata.slug,
          metadata.output,
          fingerprint,
          publicKeyPem,
        ].join("\n");

        const registrationSignature = await signText(
          keyPair.privateKey,
          registrationPayload,
        );

        const result = await claimRegistrationLink({
          token: registrationToken,
          fingerprint,
          publicKey: publicKeyPem,
          keyAlgorithm: "ed25519",
          registrationSignature,
        });

        saveDisplayRegistration({
          displayId: result.displayId,
          slug: result.slug,
          keyId: result.keyId,
          keyAlias,
          fingerprint,
          output: metadata.output,
          registeredAt: new Date().toISOString(),
        });

        setStatus({ kind: "success", slug: result.slug });

        setTimeout(() => {
          router.push(`/displays/${result.slug}`);
        }, REDIRECT_DELAY_MS);
      } catch (err) {
        setStatus({
          kind: "error",
          message:
            err instanceof Error
              ? err.message
              : "Registration failed. The link may be expired or already used.",
        });
      }
    },
    [router],
  );

  useEffect(() => {
    if (hasStarted.current || !token) return;
    hasStarted.current = true;
    queueMicrotask(() => {
      void performRegistration(token);
    });
  }, [token, performRegistration]);

  return (
    <div className="w-full max-w-md text-center">
      {status.kind === "registering" ? (
        <>
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
          <h1 className="text-xl font-semibold text-foreground">
            Registering display...
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Generating cryptographic keys and completing registration.
          </p>
        </>
      ) : null}

      {status.kind === "success" ? (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-muted)]">
            <svg
              className="h-6 w-6 text-[var(--success-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Registration complete!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Display is now active. Redirecting to display runtime...
          </p>
        </>
      ) : null}

      {status.kind === "error" ? (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Registration failed
          </h1>
          <p className="mt-2 text-sm text-destructive">{status.message}</p>
        </>
      ) : null}
    </div>
  );
}

export default function LinkRegistrationPage(): ReactElement {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
            <h1 className="text-xl font-semibold text-foreground">
              Loading...
            </h1>
          </div>
        }
      >
        <LinkRegistrationContent />
      </Suspense>
    </main>
  );
}
