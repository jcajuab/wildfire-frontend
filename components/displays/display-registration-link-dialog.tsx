"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RequiredLabel } from "@/components/common/required-label";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DisplayGroupsTagsInput } from "@/components/displays/display-groups-tags-input";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  ensureFreshAccessToken,
  getAuthorizationHeaders,
} from "@/lib/auth-session";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import {
  useCreateRegistrationLinkMutation,
  useGetDisplayGroupsQuery,
} from "@/lib/api/displays-api";
import {
  DISPLAY_OUTPUT_TYPES,
  type DisplayOutputType,
} from "@/lib/display-output";
import { IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface DisplayRegistrationLinkDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegistrationSucceeded?: () => void;
}

interface RegistrationSucceededEvent {
  readonly type: "registration_succeeded";
  readonly attemptId: string;
  readonly displayId: string;
  readonly slug: string;
  readonly occurredAt: string;
}

interface LinkFormState {
  readonly displayName: string;
  readonly slug: string;
  readonly outputType: DisplayOutputType;
  readonly outputIndex: string;
  readonly displayGroups: string[];
}

type DialogStep =
  | { kind: "form" }
  | {
      kind: "link-ready";
      token: string;
      attemptId: string;
      expiresAt: string;
    };

const INITIAL_FORM: LinkFormState = {
  displayName: "",
  slug: "",
  outputType: "HDMI",
  outputIndex: "0",
  displayGroups: [],
};

const FALLBACK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 120;
const DISPLAY_SLUG_APOSTROPHE_PATTERN = /['`\u2018\u2019\u02bc\uff07]/g;

function normalizeDisplaySlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(DISPLAY_SLUG_APOSTROPHE_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeEditableDisplaySlug(value: string): string {
  return value
    .toLowerCase()
    .replace(DISPLAY_SLUG_APOSTROPHE_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/g, "");
}

const isRegistrationSucceededEvent = (
  value: unknown,
): value is RegistrationSucceededEvent => {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<RegistrationSucceededEvent>;
  return (
    event.type === "registration_succeeded" &&
    typeof event.slug === "string" &&
    typeof event.attemptId === "string"
  );
};

function useCountdown(expiresAt: string | null): string {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return "";
  const remaining = Math.max(0, Date.parse(expiresAt) - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (remaining <= 0) return "Expired";
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function DisplayRegistrationLinkDialog({
  open,
  onOpenChange,
  onRegistrationSucceeded,
}: DisplayRegistrationLinkDialogProps): ReactElement {
  const [blockClose, setBlockClose] = useState(false);

  function handleOpenChange(next: boolean): void {
    if (next) setBlockClose(false);
    else if (blockClose) return;
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {open ? (
        <DisplayRegistrationLinkDialogBody
          onOpenChange={onOpenChange}
          onRegistrationSucceeded={onRegistrationSucceeded}
          onBusyChange={setBlockClose}
        />
      ) : null}
    </Dialog>
  );
}

interface DisplayRegistrationLinkDialogBodyProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegistrationSucceeded?: () => void;
  readonly onBusyChange: (busy: boolean) => void;
}

function DisplayRegistrationLinkDialogBody({
  onOpenChange,
  onRegistrationSucceeded,
  onBusyChange,
}: DisplayRegistrationLinkDialogBodyProps): ReactElement {
  const [formState, setFormState] = useState<LinkFormState>(INITIAL_FORM);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [step, setStep] = useState<DialogStep>({ kind: "form" });
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: existingGroupsData } = useGetDisplayGroupsQuery({
    page: 1,
    pageSize: 100,
  });
  const existingGroups = useMemo(
    () => existingGroupsData?.items ?? [],
    [existingGroupsData?.items],
  );
  const [createRegistrationLink, { isLoading: isSubmitting }] =
    useCreateRegistrationLinkMutation();

  const expiresAt = step.kind === "link-ready" ? step.expiresAt : null;
  const countdown = useCountdown(expiresAt);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const registrationUrl = useMemo(() => {
    if (step.kind !== "link-ready") return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/displays/register/link?token=${step.token}`;
  }, [step]);

  const updateField = useCallback(
    (field: keyof LinkFormState) =>
      (event: ChangeEvent<HTMLInputElement>): void => {
        setFormState((prev) => ({ ...prev, [field]: event.target.value }));
      },
    [],
  );

  const handleDisplayNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const displayName = event.target.value;
      setFormState((prev) => ({
        ...prev,
        displayName,
        slug: isSlugManuallyEdited
          ? prev.slug
          : normalizeDisplaySlug(displayName),
      }));
    },
    [isSlugManuallyEdited],
  );

  const handleSlugChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      setIsSlugManuallyEdited(true);
      setFormState((prev) => ({
        ...prev,
        slug: normalizeEditableDisplaySlug(event.target.value),
      }));
    },
    [],
  );

  // SSE subscription for registration success
  useEffect(() => {
    if (step.kind !== "link-ready") return;
    const { attemptId } = step;
    const baseUrl = getBaseUrl();
    if (!baseUrl) return;

    const controller = new AbortController();

    void (async () => {
      try {
        await ensureFreshAccessToken();
        const url = `${baseUrl}/displays/registration-attempts/${attemptId}/events`;
        const response = await fetch(url, {
          headers: { ...getAuthorizationHeaders() },
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          let currentData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              currentData += (currentData ? "\n" : "") + line.slice(5).trim();
            } else if (line === "") {
              if (currentEvent === "registration_succeeded" && currentData) {
                try {
                  const payload = JSON.parse(currentData) as unknown;
                  if (isRegistrationSucceededEvent(payload)) {
                    toast.success(
                      `Display "${payload.slug}" registered successfully.`,
                    );
                    void revalidateWildfireTagsViaRoute([
                      "displays-bootstrap",
                      "displays-options",
                      "schedules-bootstrap",
                    ]);
                    onRegistrationSucceeded?.();
                    onOpenChange(false);
                  }
                } catch {
                  // Ignore malformed events
                }
              }
              currentEvent = "";
              currentData = "";
            }
          }
        }
      } catch {
        // Stream ended or was aborted
      }
    })();

    return () => {
      controller.abort();
    };
  }, [step, onRegistrationSucceeded, onOpenChange]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setFormError(null);

      const name = formState.displayName.trim();
      const slug = normalizeDisplaySlug(formState.slug);
      const outputIndex = Number.parseInt(formState.outputIndex, 10);

      if (!name) {
        setFormError("Display name is required.");
        return;
      }
      if (
        !slug ||
        slug.length < MIN_SLUG_LENGTH ||
        slug.length > MAX_SLUG_LENGTH ||
        !FALLBACK_SLUG_PATTERN.test(slug)
      ) {
        setFormError(
          "Slug must be 3-120 characters, lowercase alphanumeric with hyphens (e.g. lobby-hdmi-0).",
        );
        return;
      }
      if (!Number.isInteger(outputIndex) || outputIndex < 0) {
        setFormError("Output index must be a non-negative integer.");
        return;
      }

      onBusyChange(true);
      try {
        const result = await createRegistrationLink({
          slug,
          displayName: name,
          outputType: formState.outputType,
          outputIndex,
          displayGroups: formState.displayGroups,
        }).unwrap();

        setStep({
          kind: "link-ready",
          token: result.token,
          attemptId: result.attemptId,
          expiresAt: result.expiresAt,
        });
      } catch (err) {
        notifyApiError(err, "Failed to create registration link.");
      } finally {
        onBusyChange(false);
      }
    },
    [formState, createRegistrationLink, onBusyChange],
  );

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link to clipboard.");
    }
  }, [registrationUrl]);

  return (
    <DialogContent
      ref={dialogContentRef}
      className="max-w-[calc(100%-2rem)] sm:max-w-lg"
      onPointerDownOutside={(e) => {
        if (
          dialogContentRef.current &&
          !dialogContentRef.current.contains(e.target as Node)
        ) {
          return;
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Register Display</DialogTitle>
        <DialogDescription>
          {step.kind === "form"
            ? "Create a registration link for this display."
            : "Copy this link and open it on the display device. Registration completes automatically when the device connects."}
        </DialogDescription>
      </DialogHeader>

      {step.kind === "form" ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <p
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="space-y-2">
            <RequiredLabel htmlFor="reg-display-name">
              Display Name
            </RequiredLabel>
            <Input
              id="reg-display-name"
              type="text"
              placeholder="Enter display name"
              value={formState.displayName}
              onChange={handleDisplayNameChange}
              autoComplete="off"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <RequiredLabel htmlFor="reg-slug">Display Slug</RequiredLabel>
            <Input
              id="reg-slug"
              type="text"
              placeholder="Auto-generated from display name"
              value={formState.slug}
              onChange={handleSlugChange}
              autoComplete="off"
              spellCheck={false}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <DisplayGroupsTagsInput
              id="reg-groups"
              value={formState.displayGroups}
              onValueChange={(names) =>
                setFormState((prev) => ({ ...prev, displayGroups: names }))
              }
              existingGroups={existingGroups}
              disabled={isSubmitting}
              showLabel
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredLabel htmlFor="reg-output-type">
                Output Type
              </RequiredLabel>
              <Select
                value={formState.outputType}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    outputType: value as DisplayOutputType,
                  }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="reg-output-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISPLAY_OUTPUT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <RequiredLabel htmlFor="reg-output-index">
                Output Index
              </RequiredLabel>
              <Input
                id="reg-output-index"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                value={formState.outputIndex}
                onChange={updateField("outputIndex")}
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <DialogFooter className="flex-row justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating link..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Label htmlFor="registration-link">Registration Link</Label>
              <p
                className={
                  countdown === "Expired"
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {countdown === "Expired" ? (
                  "Expired. Create a new registration link to continue."
                ) : (
                  <>Expires in {countdown}</>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="url"
                id="registration-link"
                value={registrationUrl}
                readOnly
                spellCheck={false}
                className="min-w-0 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                className="sm:w-auto"
                onClick={handleCopyLink}
                disabled={countdown === "Expired"}
              >
                <IconCopy
                  className="size-4"
                  aria-hidden="true"
                  data-icon="inline-start"
                />
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">Next Steps</p>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Copy the registration link.</li>
              <li>Open it on the display device.</li>
              <li>Keep this dialog open until the display connects.</li>
            </ol>
          </div>

          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button type="button">Done</Button>
            </DialogClose>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}
