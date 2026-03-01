export interface ApiLinks {
  readonly self: string;
  readonly first?: string;
  readonly prev?: string;
  readonly next?: string;
  readonly last?: string;
}

export interface ApiMeta {
  readonly total: number;
  readonly page: number;
  readonly per_page: number;
  readonly total_pages: number;
}

export interface ApiResponse<T> {
  readonly data: T;
  readonly links?: ApiLinks;
}

export interface ApiListResponse<T> extends ApiResponse<readonly T[]> {
  readonly meta: ApiMeta;
}

export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

type UnknownObject = Record<string, unknown>;

interface NonJsonPayloadFailure {
  readonly __parseFailure: true;
  readonly message: string;
  readonly status: number;
  readonly statusText: string;
  readonly contentType: string;
  readonly bodyPreview: string;
  readonly url: string;
}

const isObject = (value: unknown): value is UnknownObject =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value);

const formatPayloadType = (value: unknown): string => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }
  return typeof value;
};

const isNonJsonPayloadFailure = (
  payload: unknown,
): payload is NonJsonPayloadFailure => {
  return (
    isObject(payload) &&
    payload.__parseFailure === true &&
    typeof payload.message === "string" &&
    typeof payload.status === "number" &&
    typeof payload.statusText === "string" &&
    typeof payload.contentType === "string" &&
    typeof payload.bodyPreview === "string" &&
    typeof payload.url === "string"
  );
};

const getParseFailureMessage = (payload: unknown): string | undefined => {
  if (isNonJsonPayloadFailure(payload)) {
    const parseFailure = payload;
    const preview =
      parseFailure.bodyPreview === ""
        ? "empty"
        : `body preview ${parseFailure.bodyPreview}`;
    return `${parseFailure.message}. ${preview}.`;
  }

  return undefined;
};

const toNonNegativeInteger = (value: unknown): number | undefined =>
  isInteger(value) && value >= 0
    ? value
    : typeof value === "string"
      ? (() => {
          const normalized = value.trim();
          if (!/^-?\d+$/.test(normalized)) return undefined;
          const parsed = Number.parseInt(normalized, 10);
          return parsed >= 0 ? parsed : undefined;
        })()
      : undefined;

const toPositiveInteger = (value: unknown): number | undefined =>
  isInteger(value) && value > 0
    ? value
    : typeof value === "string"
      ? (() => {
          const normalized = value.trim();
          if (!/^-?\d+$/.test(normalized)) return undefined;
          const parsed = Number.parseInt(normalized, 10);
          return parsed > 0 ? parsed : undefined;
        })()
      : undefined;

const parseApiErrorResponse = (value: unknown): ApiErrorResponse => {
  if (!isObject(value) || !isObject(value.error)) {
    throw new Error("Invalid API error payload shape.");
  }

  const code = value.error.code;
  const message = value.error.message;
  if (!isString(code) || !isString(message)) {
    throw new Error("Invalid API error payload shape.");
  }

  return { error: { code, message } };
};

export function extractApiError(payload: unknown): ApiErrorResponse | null {
  if (!isObject(payload)) return null;
  if (!isObject(payload.error)) return null;
  try {
    return parseApiErrorResponse(payload);
  } catch {
    return null;
  }
}

function parseApiEnvelope<T>(value: UnknownObject): ApiResponse<T> {
  if (!Object.hasOwn(value, "data")) {
    throw new Error("API payload is missing envelope data field.");
  }
  const data = value.data;
  const links = isObject(value.links)
    ? ({
        self: isString(value.links.self) ? value.links.self : "unknown",
        first: isString(value.links.first) ? value.links.first : undefined,
        prev: isString(value.links.prev) ? value.links.prev : undefined,
        next: isString(value.links.next) ? value.links.next : undefined,
        last: isString(value.links.last) ? value.links.last : undefined,
      } satisfies ApiLinks)
    : undefined;

  return { data: data as T, links };
}

export function parseApiResponse<T>(payload: unknown): ApiResponse<T> {
  const parseFailureMessage = getParseFailureMessage(payload);
  if (parseFailureMessage) {
    throw new Error(parseFailureMessage);
  }

  if (!isObject(payload)) {
    throw new Error(
      `API payload is not a JSON object: received ${formatPayloadType(payload)}.`,
    );
  }

  const apiError = extractApiError(payload);
  if (apiError) {
    throw new Error(
      `API payload response is an error response: ${apiError.error.code} - ${apiError.error.message}`,
    );
  }

  return parseApiEnvelope<T>(payload);
}

export function parseApiListResponse<T>(payload: unknown): ApiListResponse<T> {
  const parseFailureMessage = getParseFailureMessage(payload);
  if (parseFailureMessage) {
    throw new Error(parseFailureMessage);
  }

  if (!isObject(payload)) {
    throw new Error(
      `API payload is not a JSON object: received ${formatPayloadType(payload)}.`,
    );
  }

  const apiError = extractApiError(payload);
  if (apiError) {
    throw new Error(
      `API list payload is an error response: ${apiError.error.code} - ${apiError.error.message}`,
    );
  }

  if (!Object.hasOwn(payload, "data")) {
    throw new Error("API payload list response is missing data field.");
  }

  const maybeData = payload.data;
  if (!Array.isArray(maybeData)) {
    throw new Error("API payload list response must include an array.");
  }

  if (!isObject(payload.meta)) {
    throw new Error("API payload list response is missing meta.");
  }

  const meta = payload.meta;
  const total = toNonNegativeInteger(meta.total);
  const page = toPositiveInteger(meta.page);
  const perPage = toPositiveInteger(meta.per_page);
  const totalPages = toNonNegativeInteger(meta.total_pages);

  const totalValue = isInteger(total) && total >= 0 ? total : undefined;
  const pageValue = isInteger(page) && page >= 1 ? page : undefined;
  const perPageValue = isInteger(perPage) && perPage >= 1 ? perPage : undefined;
  const totalPagesValue =
    isInteger(totalPages) && totalPages >= 0 ? totalPages : undefined;

  if (totalValue === undefined) {
    throw new Error("API payload list response has invalid meta.total.");
  }
  if (pageValue === undefined) {
    throw new Error("API payload list response has invalid meta.page.");
  }
  if (perPageValue === undefined) {
    throw new Error("API payload list response has invalid meta.per_page.");
  }
  if (totalPagesValue === undefined) {
    throw new Error("API payload list response has invalid meta.total_pages.");
  }

  return {
    data: maybeData as readonly T[],
    links: parseApiResponse<readonly T[]>(payload).links,
    meta: {
      total: totalValue,
      page: pageValue,
      per_page: perPageValue,
      total_pages: totalPagesValue,
    },
  };
}

export function parseApiResponseData<T>(payload: unknown): T {
  return parseApiResponse<T>(payload).data;
}

const buildApiParseError = (context: string, error: unknown): Error => {
  const message =
    error instanceof Error ? error.message : "Invalid payload format.";
  return new Error(`${context}: ${message}`);
};

export function parseApiResponseDataSafe<T>(
  payload: unknown,
  context: string,
): T {
  try {
    return parseApiResponseData<T>(payload);
  } catch (error) {
    throw buildApiParseError(context, error);
  }
}

export function parseApiListResponseSafe<T>(
  payload: unknown,
  context: string,
): ApiListResponse<T> {
  try {
    return parseApiListResponse<T>(payload);
  } catch (error) {
    throw buildApiParseError(context, error);
  }
}

export function parseApiListResponseData<T>(payload: unknown): T[] {
  return [...parseApiListResponse<T>(payload).data];
}

export function parseApiListResponseDataSafe<T>(
  payload: unknown,
  context: string,
): T[] {
  return [...parseApiListResponseSafe<T>(payload, context).data];
}
