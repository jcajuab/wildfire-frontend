"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRegistrationSession,
  registerDisplay,
} from "@/lib/display-api/client";
import {
  assertDisplayCryptoSupport,
  exportPublicKeyPem,
  getOrCreateDisplayKeyPair,
  signText,
} from "@/lib/crypto/key-manager";
import { deriveDisplayFingerprint } from "@/lib/display-identity/fingerprint";
import { saveDisplayRegistration } from "@/lib/display-identity/registration-store";

const PAIRING_CODE_PATTERN = /^\d{6}$/;
const DISPLAY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_RESOLUTION = 1;

interface RegisterFormState {
  readonly registrationCode: string;
  readonly displayName: string;
  readonly slug: string;
  readonly output: string;
  readonly resolutionWidth: string;
  readonly resolutionHeight: string;
}

type RegisterField =
  | "registrationCode"
  | "displayName"
  | "slug"
  | "output"
  | "resolutionWidth"
  | "resolutionHeight";

type RegisterStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const INITIAL_REGISTER_FORM: RegisterFormState = {
  registrationCode: "",
  displayName: "",
  slug: "",
  output: "",
  resolutionWidth: "",
  resolutionHeight: "",
};

const INITIAL_STATUS: RegisterStatus = { kind: "idle" };

function toPositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (
    Number.isNaN(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < MIN_RESOLUTION
  ) {
    return null;
  }
  return parsed;
}

const focusField = (form: HTMLFormElement, fieldName: RegisterField): void => {
  const field = form.elements.namedItem(fieldName);
  if (field instanceof HTMLElement) {
    field.focus();
  }
};

export default function RegisterDisplayPage(): ReactElement {
  const [formState, setFormState] = useState<RegisterFormState>(
    INITIAL_REGISTER_FORM,
  );
  const [status, setStatus] = useState<RegisterStatus>(INITIAL_STATUS);

  const normalizedSlug = formState.slug.trim().toLowerCase();
  const isSubmitting = status.kind === "submitting";

  const updateField = useCallback(
    (field: keyof RegisterFormState) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        const { value } = event.target;
        setFormState((previous) => ({ ...previous, [field]: value }));
      },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setStatus(INITIAL_STATUS);

      const form = event.currentTarget;
      const code = formState.registrationCode.trim();
      const name = formState.displayName.trim();
      const slug = normalizedSlug;
      const outputName = formState.output.trim();
      const width = toPositiveInteger(formState.resolutionWidth);
      const height = toPositiveInteger(formState.resolutionHeight);

      if (!PAIRING_CODE_PATTERN.test(code)) {
        setStatus({
          kind: "error",
          message: "Registration code must be a 6-digit number.",
        });
        focusField(form, "registrationCode");
        return;
      }
      if (!name) {
        setStatus({ kind: "error", message: "Display name is required." });
        focusField(form, "displayName");
        return;
      }
      if (!DISPLAY_SLUG_PATTERN.test(slug)) {
        setStatus({
          kind: "error",
          message:
            "Display slug must be lowercase kebab-case with letters, numbers, and hyphens.",
        });
        focusField(form, "slug");
        return;
      }
      if (!outputName) {
        setStatus({ kind: "error", message: "Display output is required." });
        focusField(form, "output");
        return;
      }
      if (width === null || height === null) {
        setStatus({
          kind: "error",
          message: "Resolution width and height must be positive integers.",
        });
        focusField(
          form,
          width === null ? "resolutionWidth" : "resolutionHeight",
        );
        return;
      }

      setStatus({ kind: "submitting" });
      try {
        assertDisplayCryptoSupport();

        const canonicalOutput = outputName.toLowerCase();
        const keyAlias = `display-output:${canonicalOutput}`;
        const registrationSessionPromise = createRegistrationSession(code);
        const keyPairPromise = getOrCreateDisplayKeyPair(keyAlias);
        const [registrationSession, keyPair] = await Promise.all([
          registrationSessionPromise,
          keyPairPromise,
        ]);
        const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);
        const fingerprint = await deriveDisplayFingerprint({
          output: canonicalOutput,
          publicKeyPem,
        });

        const registrationPayload = [
          "REGISTRATION",
          registrationSession.registrationSessionId,
          registrationSession.challengeNonce,
          slug,
          canonicalOutput,
          fingerprint,
          publicKeyPem,
        ].join("\n");
        const registrationSignature = await signText(
          keyPair.privateKey,
          registrationPayload,
        );

        const registration = await registerDisplay({
          registrationSessionId: registrationSession.registrationSessionId,
          slug,
          displayName: name,
          resolutionWidth: width,
          resolutionHeight: height,
          output: canonicalOutput,
          fingerprint,
          publicKey: publicKeyPem,
          keyAlgorithm: "ed25519",
          registrationSignature,
        });

        saveDisplayRegistration({
          displayId: registration.displayId,
          slug: registration.slug,
          keyId: registration.keyId,
          keyAlias,
          fingerprint,
          output: canonicalOutput,
          registeredAt: new Date().toISOString(),
        });

        setStatus({
          kind: "success",
          message: `Registration complete. Display ${registration.slug} is now connected.`,
        });
      } catch (error) {
        setStatus({
          kind: "error",
          message:
            error instanceof Error
              ? `${error.message} Review the inputs and try again.`
              : "Registration failed. Review the inputs and try again.",
        });
      }
    },
    [formState, normalizedSlug],
  );

  return (
    <main className="min-h-svh bg-background">
      <section className="mx-auto flex min-h-svh w-full max-w-lg items-center justify-center px-6 py-10 sm:px-10">
        <div className="w-full">
          <div className="flex flex-col items-start gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Register Display
            </h1>
            <p className="text-sm text-muted-foreground">
              Use a one-time registration code to register a display output.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div aria-live="polite">
              {status.kind === "error" ? (
                <p
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {status.message}
                </p>
              ) : null}

              {status.kind === "success" ? (
                <p
                  className="rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]"
                  role="status"
                >
                  {status.message} Open runtime at{" "}
                  <Link
                    className="underline underline-offset-4 transition-colors hover:text-foreground"
                    href={`/displays/${normalizedSlug}`}
                  >
                    /displays/{normalizedSlug}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration-code">Registration code</Label>
              <Input
                id="registration-code"
                type="text"
                inputMode="numeric"
                placeholder="123456…"
                name="registrationCode"
                value={formState.registrationCode}
                onChange={updateField("registrationCode")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg text-sm"
                required
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Lobby Screen…"
                name="displayName"
                value={formState.displayName}
                onChange={updateField("displayName")}
                autoComplete="off"
                className="h-11 rounded-lg text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-slug">Display slug</Label>
              <Input
                id="display-slug"
                type="text"
                placeholder="lobby-hdmi-0…"
                name="slug"
                value={formState.slug}
                onChange={updateField("slug")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-output">Display output</Label>
              <Input
                id="display-output"
                type="text"
                placeholder="HDMI-0…"
                name="output"
                value={formState.output}
                onChange={updateField("output")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg text-sm"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resolution-width">Resolution width</Label>
                <Input
                  id="resolution-width"
                  type="number"
                  min={MIN_RESOLUTION}
                  inputMode="numeric"
                  placeholder="1920…"
                  name="resolutionWidth"
                  value={formState.resolutionWidth}
                  onChange={updateField("resolutionWidth")}
                  autoComplete="off"
                  className="h-11 rounded-lg text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution-height">Resolution height</Label>
                <Input
                  id="resolution-height"
                  type="number"
                  min={MIN_RESOLUTION}
                  inputMode="numeric"
                  placeholder="1080…"
                  name="resolutionHeight"
                  value={formState.resolutionHeight}
                  onChange={updateField("resolutionHeight")}
                  autoComplete="off"
                  className="h-11 rounded-lg text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-lg text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registering…" : "Register Display"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
