import { toast } from "sonner";
import { extractApiError } from "@/lib/api/contracts";

interface ErrorLikeObject {
  [key: string]: unknown;
}

interface NormalizedError {
  readonly message: string;
}

const DEFAULT_FALLBACK_MESSAGE = "Request failed. Try again.";

/** User-facing copy when the API is unreachable or returns non-JSON (e.g. HTML error pages). */
export const CLIENT_TRANSPORT_ERROR_MESSAGE =
  "Unable to reach the server. Check your connection and try again.";

const RTK_TRANSPORT_STATUSES = [
  "PARSING_ERROR",
  "FETCH_ERROR",
  "TIMEOUT_ERROR",
] as const;

function isRtkTransportStatus(
  status: unknown,
): status is (typeof RTK_TRANSPORT_STATUSES)[number] {
  return (
    typeof status === "string" &&
    (RTK_TRANSPORT_STATUSES as readonly string[]).includes(status)
  );
}

/** Maps noisy parser/network messages to a safe, generic line for the UI. */
export function sanitizeTechnicalTransportMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return DEFAULT_FALLBACK_MESSAGE;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("unexpected token") &&
    (lower.includes("<") || lower.includes("is not valid json"))
  ) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("<!doctype") || lower.includes("<html")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("response body is not valid json")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("api payload is not a json object")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("failed to fetch")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("networkerror") || lower.includes("network error")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  if (lower.includes("load failed")) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }
  return trimmed;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was invalid or missing required data.",
  401: "Your session is no longer valid. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This request conflicts with the current state.",
  422: "The submitted data is invalid.",
  429: "Rate limit reached. Please wait and retry.",
  500: "The server is unavailable. Please try again later.",
  502: "A temporary server gateway issue occurred. Please retry.",
  503: "The service is temporarily unavailable. Please try again later.",
  504: "The request timed out. Please try again.",
};

const getStatusMessage = (
  status: number | string | null | undefined,
): string | null => {
  const statusNumber = normalizeStatus(status);
  if (statusNumber === null) return null;
  return STATUS_MESSAGES[statusNumber] ?? null;
};

const normalizeStatus = (
  status: number | string | null | undefined,
): number | null => {
  if (typeof status === "number" && Number.isInteger(status)) {
    return status;
  }
  if (typeof status === "string") {
    const parsed = Number.parseInt(status, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
};

const isRecord = (value: unknown): value is ErrorLikeObject => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const extractPayloadMessage = (payload: unknown): string | null => {
  const apiError = extractApiError(payload);
  if (apiError?.error?.message) {
    return apiError.error.message;
  }

  if (
    isRecord(payload) &&
    Object.hasOwn(payload, "__parseFailure") &&
    (payload as { __parseFailure?: unknown }).__parseFailure === true
  ) {
    return CLIENT_TRANSPORT_ERROR_MESSAGE;
  }

  if (
    isRecord(payload) &&
    typeof payload.message === "string" &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }

  if (
    isRecord(payload) &&
    typeof payload.error === "string" &&
    payload.error.trim().length > 0
  ) {
    return sanitizeTechnicalTransportMessage(payload.error);
  }

  return null;
};

const extractErrorMessageFromWrappedPayload = (err: {
  [key: string]: unknown;
}): string | null => {
  const data = err.data;
  if (data === undefined) {
    return null;
  }

  return extractPayloadMessage(data);
};

const normalizeError = (error: unknown): NormalizedError => {
  if (error instanceof Error) {
    const raw = error.message.trim();
    return {
      message:
        raw.length === 0
          ? DEFAULT_FALLBACK_MESSAGE
          : sanitizeTechnicalTransportMessage(raw),
    };
  }

  if (!isRecord(error)) {
    return { message: DEFAULT_FALLBACK_MESSAGE };
  }

  if (isRtkTransportStatus(error.status)) {
    return { message: CLIENT_TRANSPORT_ERROR_MESSAGE };
  }

  const payloadMessage = extractPayloadMessage(error);
  if (payloadMessage) {
    return { message: payloadMessage };
  }

  const wrappedPayloadMessage = extractErrorMessageFromWrappedPayload(error);
  if (wrappedPayloadMessage) {
    return { message: wrappedPayloadMessage };
  }

  const rawStatus = (
    error as {
      status?: number | string | null;
    }
  ).status;
  const statusMessage = getStatusMessage(rawStatus);
  if (statusMessage) {
    return {
      message:
        typeof error.message === "string" && error.message.trim().length > 0
          ? error.message
          : statusMessage,
    };
  }

  if (typeof error.message === "string" && error.message.trim().length > 0) {
    return { message: error.message };
  }

  if (typeof error.error === "string" && error.error.trim().length > 0) {
    return { message: error.error };
  }

  return { message: DEFAULT_FALLBACK_MESSAGE };
};

/**
 * Extracts the user-facing error message from a thrown value (e.g. from RTK Query mutation unwrap()).
 * RTK Query often throws an object with `status` and `data` (parsed JSON), not an Error instance.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const { message } = normalizeError(err);
  if (typeof fallback !== "string" || fallback.trim().length === 0) {
    return message;
  }

  if (message !== DEFAULT_FALLBACK_MESSAGE) {
    return message;
  }
  return fallback;
}

interface NotifyApiErrorOptions {
  readonly id?: string;
  readonly prefix?: string;
  readonly dedupe?: boolean;
}

export function notifyApiError(
  error: unknown,
  fallback: string,
  options: NotifyApiErrorOptions = {},
): string {
  const baseMessage = getApiErrorMessage(error, fallback);
  const message = options.prefix
    ? `${options.prefix}: ${baseMessage}`
    : baseMessage;

  if (typeof window === "undefined") {
    return message;
  }

  toast.error(message, {
    id:
      options.dedupe === false
        ? undefined
        : (options.id ?? `wildfire:error:${message}`),
  });

  return message;
}
