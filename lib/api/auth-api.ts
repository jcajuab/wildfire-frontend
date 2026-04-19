import {
  extractApiError,
  type ApiErrorResponse,
} from "@/lib/api/contracts";

interface JsonParseFailurePayload {
  readonly __parseFailure: true;
  readonly message: string;
  readonly status: number;
  readonly statusText: string;
  readonly contentType: string;
  readonly bodyPreview: string;
  readonly url: string;
}

const previewResponseBody = (body: string, maxLength = 500): string => {
  const trimmed = body.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
};

export const buildParseFailurePayload = (
  response: Response,
  body: string,
): JsonParseFailurePayload => {
  const contentType = response.headers.get("content-type") ?? "unknown";
  const message =
    body.trim().length === 0
      ? `Response body was empty while parsing JSON (status ${response.status}).`
      : `Response body is not valid JSON (status ${response.status}, content-type ${contentType}).`;

  return {
    __parseFailure: true,
    message,
    status: response.status,
    statusText: response.statusText,
    contentType,
    bodyPreview: previewResponseBody(body),
    url: response.url,
  };
};

export async function readJsonPayload(response: Response): Promise<unknown> {
  let body: string;

  try {
    body = await response.text();
  } catch {
    return buildParseFailurePayload(response, "");
  }

  if (body.trim() === "") {
    return buildParseFailurePayload(response, body);
  }

  try {
    return JSON.parse(body);
  } catch {
    return buildParseFailurePayload(response, body);
  }
}

export function createAuthApiError(
  response: Response,
  payload: unknown,
): AuthApiError {
  const parsedError = extractApiError(payload) ?? undefined;
  const parseFailureMessage =
    typeof payload === "object" &&
    payload !== null &&
    Object.hasOwn(payload, "__parseFailure")
      ? (payload as { message?: unknown }).message
      : undefined;

  const parseFailureText =
    typeof parseFailureMessage === "string" ? parseFailureMessage : undefined;

  const message =
    parsedError?.error?.message ??
    parseFailureText ??
    `Request failed with status ${response.status}`;
  return new AuthApiError(message, response.status, parsedError);
}

/** Error thrown by auth API with status and optional backend body. */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}
