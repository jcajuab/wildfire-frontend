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
  exportPublicKeyPem,
  getOrCreateDisplayKeyPair,
  signText,
} from "@/lib/crypto/key-manager";
import { deriveDisplayFingerprint } from "@/lib/display-identity/fingerprint";
import { getProvisionedMachineId } from "@/lib/display-identity/provisioning";
import { saveDisplayRegistration } from "@/lib/display-identity/registration-store";

const PAIRING_CODE_PATTERN = /^\d{6}$/;
const DISPLAY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_RESOLUTION = 1;

interface RegisterFormState {
  readonly registrationCode: string;
  readonly displayName: string;
  readonly displaySlug: string;
  readonly displayOutput: string;
  readonly resolutionWidth: string;
  readonly resolutionHeight: string;
}

const INITIAL_REGISTER_FORM: RegisterFormState = {
  registrationCode: "",
  displayName: "",
  displaySlug: "",
  displayOutput: "",
  resolutionWidth: "",
  resolutionHeight: "",
};

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

export default function RegisterDisplayPage(): ReactElement {
  const [formState, setFormState] = useState<RegisterFormState>(
    INITIAL_REGISTER_FORM,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const normalizedSlug = formState.displaySlug.trim().toLowerCase();

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
      setErrorMessage(null);
      setSuccessMessage(null);

      const code = formState.registrationCode.trim();
      const name = formState.displayName.trim();
      const slug = normalizedSlug;
      const outputName = formState.displayOutput.trim();
      const width = toPositiveInteger(formState.resolutionWidth);
      const height = toPositiveInteger(formState.resolutionHeight);

      if (!PAIRING_CODE_PATTERN.test(code)) {
        setErrorMessage("Registration code must be a 6-digit number.");
        return;
      }
      if (!name) {
        setErrorMessage("Display name is required.");
        return;
      }
      if (!DISPLAY_SLUG_PATTERN.test(slug)) {
        setErrorMessage(
          "Display slug must be lowercase kebab-case (letters, numbers, hyphens).",
        );
        return;
      }
      if (!outputName) {
        setErrorMessage("Display output is required.");
        return;
      }
      if (width === null || height === null) {
        setErrorMessage(
          "Resolution width and height must be positive integers.",
        );
        return;
      }

      setIsSubmitting(true);
      try {
        const registrationSession = await createRegistrationSession(code);
        const machineId = await getProvisionedMachineId();
        const displayFingerprint = await deriveDisplayFingerprint({
          machineId,
          displayOutput: outputName,
        });

        const keyAlias = `${displayFingerprint}:${outputName}`;
        const keyPair = await getOrCreateDisplayKeyPair(keyAlias);
        const publicKeyPem = await exportPublicKeyPem(keyPair.publicKey);

        const registrationPayload = [
          "REGISTRATION",
          registrationSession.registrationSessionId,
          registrationSession.challengeNonce,
          slug,
          outputName,
          displayFingerprint,
          publicKeyPem,
        ].join("\n");
        const registrationSignature = await signText(
          keyPair.privateKey,
          registrationPayload,
        );

        const registration = await registerDisplay({
          registrationSessionId: registrationSession.registrationSessionId,
          displaySlug: slug,
          displayName: name,
          resolutionWidth: width,
          resolutionHeight: height,
          displayOutput: outputName,
          displayFingerprint,
          publicKey: publicKeyPem,
          keyAlgorithm: "ed25519",
          registrationSignature,
        });

        saveDisplayRegistration({
          displayId: registration.displayId,
          displaySlug: registration.displaySlug,
          keyId: registration.keyId,
          keyAlias,
          displayFingerprint,
          displayOutput: outputName,
          registeredAt: new Date().toISOString(),
        });

        setSuccessMessage(
          `Registration complete. Display ${registration.displaySlug} is now connected.`,
        );
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Registration failed.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState, normalizedSlug],
  );

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center px-6 py-10 sm:px-10">
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
            {errorMessage ? (
              <p
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p
                className="rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]"
                role="status"
              >
                {successMessage} Open runtime at{" "}
                <Link
                  className="underline underline-offset-4 transition-colors hover:text-foreground"
                  href={`/displays/${normalizedSlug}`}
                >
                  /displays/{normalizedSlug}
                </Link>
                .
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="registration-code">Registration code</Label>
              <Input
                id="registration-code"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                name="registrationCode"
                value={formState.registrationCode}
                onChange={updateField("registrationCode")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg bg-white text-sm"
                required
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Lobby Screen"
                name="displayName"
                value={formState.displayName}
                onChange={updateField("displayName")}
                autoComplete="off"
                className="h-11 rounded-lg bg-white text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-slug">Display slug</Label>
              <Input
                id="display-slug"
                type="text"
                placeholder="lobby-hdmi-0"
                name="displaySlug"
                value={formState.displaySlug}
                onChange={updateField("displaySlug")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg bg-white text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-output">Display output</Label>
              <Input
                id="display-output"
                type="text"
                placeholder="HDMI-0"
                name="displayOutput"
                value={formState.displayOutput}
                onChange={updateField("displayOutput")}
                autoComplete="off"
                spellCheck={false}
                className="h-11 rounded-lg bg-white text-sm"
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
                  placeholder="1920"
                  name="resolutionWidth"
                  value={formState.resolutionWidth}
                  onChange={updateField("resolutionWidth")}
                  autoComplete="off"
                  className="h-11 rounded-lg bg-white text-sm"
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
                  placeholder="1080"
                  name="resolutionHeight"
                  value={formState.resolutionHeight}
                  onChange={updateField("resolutionHeight")}
                  autoComplete="off"
                  className="h-11 rounded-lg bg-white text-sm"
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
