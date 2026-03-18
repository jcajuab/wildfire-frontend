"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisplayGroupsCombobox } from "@/components/displays/display-groups-combobox";
import {
  createRegistrationSession,
  fetchDisplayRegistrationConstraints,
  registerDisplay,
  type DisplayRegistrationConstraints,
} from "@/lib/display-api/client";
import {
  assertDisplayCryptoSupport,
  exportPublicKeyPem,
  getOrCreateDisplayKeyPair,
  signText,
} from "@/lib/crypto/key-manager";
import { deriveDisplayFingerprint } from "@/lib/display-identity/fingerprint";
import { saveDisplayRegistration } from "@/lib/display-identity/registration-store";
import {
  DISPLAY_OUTPUT_TYPES,
  toCanonicalDisplayOutput,
  type DisplayOutputType,
} from "@/lib/display-output";
import {
  useGetDisplayGroupsQuery,
  useCreateDisplayGroupMutation,
  useSetDisplayGroupsMutation,
} from "@/lib/api/displays-api";
import {
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";

const PAIRING_CODE_PATTERN = /^\d{6}$/;
const FALLBACK_DISPLAY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_RESOLUTION = 1;

interface RegisterFormState {
  readonly registrationCode: string;
  readonly displayName: string;
  readonly slug: string;
  readonly outputType: DisplayOutputType;
  readonly outputIndex: string;
  readonly resolutionWidth: string;
  readonly resolutionHeight: string;
  readonly displayGroups: string[];
}

type RegisterField =
  | "registrationCode"
  | "displayName"
  | "slug"
  | "outputIndex"
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
  outputType: "HDMI",
  outputIndex: "0",
  resolutionWidth: "",
  resolutionHeight: "",
  displayGroups: [],
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

const buildSlugPattern = (slugPattern: string): RegExp => {
  try {
    return new RegExp(slugPattern);
  } catch {
    return FALLBACK_DISPLAY_SLUG_PATTERN;
  }
};

const getSlugValidationMessage = (
  slug: string,
  constraints: DisplayRegistrationConstraints,
): string | null => {
  if (slug.length < constraints.minSlugLength) {
    return `Display slug must be at least ${constraints.minSlugLength} characters.`;
  }
  if (slug.length > constraints.maxSlugLength) {
    return `Display slug must be at most ${constraints.maxSlugLength} characters.`;
  }
  if (!buildSlugPattern(constraints.slugPattern).test(slug)) {
    return "Display slug must match the backend slug rules.";
  }
  return null;
};

export default function RegisterDisplayPage(): ReactElement {
  const [formState, setFormState] = useState<RegisterFormState>(
    INITIAL_REGISTER_FORM,
  );
  const [status, setStatus] = useState<RegisterStatus>(INITIAL_STATUS);

  const { data: existingGroups = [] } = useGetDisplayGroupsQuery();
  const [createDisplayGroup] = useCreateDisplayGroupMutation();
  const [setDisplayGroups] = useSetDisplayGroupsMutation();

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
      const outputIndex = Number.parseInt(formState.outputIndex, 10);
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
      if (!Number.isInteger(outputIndex) || outputIndex < 0) {
        setStatus({
          kind: "error",
          message: "Display output index must be a non-negative integer.",
        });
        focusField(form, "outputIndex");
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
        const registrationConstraints =
          await fetchDisplayRegistrationConstraints();
        const slugValidationMessage = getSlugValidationMessage(
          slug,
          registrationConstraints,
        );
        if (slugValidationMessage) {
          setStatus({
            kind: "error",
            message: slugValidationMessage,
          });
          focusField(form, "slug");
          return;
        }

        const canonicalOutput = toCanonicalDisplayOutput({
          type: formState.outputType,
          index: outputIndex,
        });
        const keyAlias = `display-output:${canonicalOutput}`;
        const registrationSessionPromise = createRegistrationSession(code);
        const keyPairPromise = getOrCreateDisplayKeyPair(keyAlias);
        const [registrationSession, keyPair] = await Promise.all([
          registrationSessionPromise,
          keyPairPromise,
        ]);
        const sessionSlugValidationMessage = getSlugValidationMessage(
          slug,
          registrationSession.constraints,
        );
        if (sessionSlugValidationMessage) {
          setStatus({
            kind: "error",
            message: sessionSlugValidationMessage,
          });
          focusField(form, "slug");
          return;
        }
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

        if (formState.displayGroups.length > 0) {
          try {
            const names = dedupeDisplayGroupNames(formState.displayGroups);
            const groupIds: string[] = [];

            for (const groupName of names) {
              const key = toDisplayGroupKey(groupName);
              const existing = existingGroups.find(
                (g) => toDisplayGroupKey(g.name) === key,
              );
              if (existing) {
                groupIds.push(existing.id);
              } else {
                const created = await createDisplayGroup({
                  name: groupName,
                }).unwrap();
                groupIds.push(created.id);
              }
            }

            await setDisplayGroups({
              displayId: registration.displayId,
              groupIds,
            }).unwrap();
          } catch {
            setStatus({
              kind: "success",
              message: `Display ${registration.slug} registered, but display groups could not be assigned. Edit the display to add groups.`,
            });
            return;
          }
        }

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
    [
      formState,
      normalizedSlug,
      existingGroups,
      createDisplayGroup,
      setDisplayGroups,
    ],
  );

  return (
    <main className='min-h-svh bg-background'>
      <section className='mx-auto flex min-h-svh w-full max-w-lg items-center justify-center px-6 py-10 sm:px-10'>
        <div className='w-full'>
          <div className='flex flex-col items-start gap-2'>
            <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
              Register Display
            </h1>
            <p className='text-sm text-muted-foreground'>
              Use a one-time registration code to register a display output.
            </p>
          </div>

          <form onSubmit={handleSubmit} className='mt-8 space-y-4'>
            <div aria-live='polite'>
              {status.kind === "error" ? (
                <p
                  className='rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive'
                  role='alert'
                >
                  {status.message}
                </p>
              ) : null}

              {status.kind === "success" ? (
                <p
                  className='rounded-lg bg-[var(--success-muted)] px-3 py-2 text-sm text-[var(--success-foreground)]'
                  role='status'
                >
                  {status.message} Open runtime at{" "}
                  <Link
                    className='underline underline-offset-4 transition-colors hover:text-foreground'
                    href={`/displays/${normalizedSlug}`}
                  >
                    /displays/{normalizedSlug}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='registration-code'>Registration code</Label>
              <Input
                id='registration-code'
                type='text'
                inputMode='numeric'
                placeholder='123456…'
                name='registrationCode'
                value={formState.registrationCode}
                onChange={updateField("registrationCode")}
                autoComplete='off'
                spellCheck={false}
                className='h-11 rounded-lg text-sm'
                required
                maxLength={6}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='display-name'>Display name</Label>
              <Input
                id='display-name'
                type='text'
                placeholder='Lobby Screen…'
                name='displayName'
                value={formState.displayName}
                onChange={updateField("displayName")}
                autoComplete='off'
                className='h-11 rounded-lg text-sm'
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='display-slug'>Display slug</Label>
              <Input
                id='display-slug'
                type='text'
                placeholder='lobby-hdmi-0…'
                name='slug'
                value={formState.slug}
                onChange={updateField("slug")}
                autoComplete='off'
                spellCheck={false}
                className='h-11 rounded-lg text-sm'
                required
              />
            </div>

            <div className='space-y-2'>
              <DisplayGroupsCombobox
                id='register-groups'
                value={formState.displayGroups}
                onValueChange={(names) =>
                  setFormState((prev) => ({ ...prev, displayGroups: names }))
                }
                existingGroups={existingGroups}
                disabled={isSubmitting}
                showLabel
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='display-output-type'>Display Output Type</Label>
                <Select
                  value={formState.outputType}
                  onValueChange={(value) =>
                    setFormState((previous) => ({
                      ...previous,
                      outputType: value as DisplayOutputType,
                    }))
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id='display-output-type'
                    className='w-full rounded-lg text-sm data-[size=default]:h-11'
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_OUTPUT_TYPES.map((outputType) => (
                      <SelectItem key={outputType} value={outputType}>
                        {outputType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='display-output-index'>
                  Display Output Index
                </Label>
                <Input
                  id='display-output-index'
                  type='number'
                  min={0}
                  inputMode='numeric'
                  placeholder='0'
                  name='outputIndex'
                  value={formState.outputIndex}
                  onChange={updateField("outputIndex")}
                  autoComplete='off'
                  className='h-11 rounded-lg text-sm'
                  required
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='resolution-width'>Resolution width</Label>
                <Input
                  id='resolution-width'
                  type='number'
                  min={MIN_RESOLUTION}
                  inputMode='numeric'
                  placeholder='1920…'
                  name='resolutionWidth'
                  value={formState.resolutionWidth}
                  onChange={updateField("resolutionWidth")}
                  autoComplete='off'
                  className='h-11 rounded-lg text-sm'
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='resolution-height'>Resolution height</Label>
                <Input
                  id='resolution-height'
                  type='number'
                  min={MIN_RESOLUTION}
                  inputMode='numeric'
                  placeholder='1080…'
                  name='resolutionHeight'
                  value={formState.resolutionHeight}
                  onChange={updateField("resolutionHeight")}
                  autoComplete='off'
                  className='h-11 rounded-lg text-sm'
                  required
                />
              </div>
            </div>

            <Button
              type='submit'
              className='h-11 w-full rounded-lg text-sm'
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
