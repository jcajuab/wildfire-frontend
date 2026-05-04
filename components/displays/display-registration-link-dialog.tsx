"use client";

import type { ChangeEvent, FormEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DisplayGroupsTagsInput } from "@/components/displays/display-groups-tags-input";
import { getBaseUrl } from "@/lib/api/base-query";
import {
  ensureFreshAccessToken,
  getAuthorizationHeaders,
} from "@/lib/auth-session";
import { notifyApiError } from "@/lib/api/get-api-error-message";
import {
  useCreateRegistrationLinkMutation,
  useGetDisplayGroupsQuery,
} from "@/lib/api/displays-api";
import {
  DISPLAY_OUTPUT_TYPES,
  type DisplayOutputType,
} from "@/lib/display-output";
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
  readonly resolutionWidth: string;
  readonly resolutionHeight: string;
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
  resolutionWidth: "",
  resolutionHeight: "",
  displayGroups: [],
};

const FALLBACK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 120;

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DisplayRegistrationLinkDialogBody
          onOpenChange={onOpenChange}
          onRegistrationSucceeded={onRegistrationSucceeded}
        />
      ) : null}
    </Dialog>
  );
}

interface DisplayRegistrationLinkDialogBodyProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onRegistrationSucceeded?: () => void;
}

function DisplayRegistrationLinkDialogBody({
  onOpenChange,
  onRegistrationSucceeded,
}: DisplayRegistrationLinkDialogBodyProps): ReactElement {
  const [formState, setFormState] = useState<LinkFormState>(INITIAL_FORM);
  const [step, setStep] = useState<DialogStep>({ kind: "form" });
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: existingGroups = [] } = useGetDisplayGroupsQuery();
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
      const slug = formState.slug.trim().toLowerCase();
      const outputIndex = Number.parseInt(formState.outputIndex, 10);
      const width = Number.parseInt(formState.resolutionWidth, 10);
      const height = Number.parseInt(formState.resolutionHeight, 10);

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
      if (
        !Number.isInteger(width) ||
        width < 1 ||
        !Number.isInteger(height) ||
        height < 1
      ) {
        setFormError("Resolution width and height must be positive integers.");
        return;
      }

      try {
        const result = await createRegistrationLink({
          slug,
          displayName: name,
          outputType: formState.outputType,
          outputIndex,
          resolutionWidth: width,
          resolutionHeight: height,
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
      }
    },
    [formState, createRegistrationLink],
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
            ? "Fill in the display details below. A registration link will be generated for the display device."
            : "Copy the link below and open it on the display device to complete registration."}
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
            <Label htmlFor="reg-display-name">Display name</Label>
            <Input
              id="reg-display-name"
              type="text"
              placeholder="Lobby Screen..."
              value={formState.displayName}
              onChange={updateField("displayName")}
              autoComplete="off"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-slug">Display slug</Label>
            <Input
              id="reg-slug"
              type="text"
              placeholder="lobby-hdmi-0..."
              value={formState.slug}
              onChange={updateField("slug")}
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
              portalContainer={dialogContentRef}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reg-output-type">Output type</Label>
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
              <Label htmlFor="reg-output-index">Output index</Label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reg-width">Resolution width</Label>
              <Input
                id="reg-width"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="1920..."
                value={formState.resolutionWidth}
                onChange={updateField("resolutionWidth")}
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-height">Resolution height</Label>
              <Input
                id="reg-height"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="1080..."
                value={formState.resolutionHeight}
                onChange={updateField("resolutionHeight")}
                autoComplete="off"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating link..." : "Register Display"}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Registration link
            </p>
            <p className="break-all rounded bg-background px-2 py-1.5 font-mono text-xs text-foreground">
              {registrationUrl}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {countdown === "Expired" ? (
                  <span className="text-destructive">Link expired</span>
                ) : (
                  <>Expires in {countdown}</>
                )}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                disabled={countdown === "Expired"}
              >
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Open this link on the display device to complete registration. This
            dialog will close automatically when registration succeeds.
          </p>

          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}
