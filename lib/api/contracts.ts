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

const isObject = (value: unknown): value is UnknownObject =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";

const isInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value);

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
        self: isString(value.links.self)
          ? value.links.self
          : "unknown",
        first: isString(value.links.first) ? value.links.first : undefined,
        prev: isString(value.links.prev) ? value.links.prev : undefined,
        next: isString(value.links.next) ? value.links.next : undefined,
        last: isString(value.links.last) ? value.links.last : undefined,
      } satisfies ApiLinks)
    : undefined;

  return { data: data as T, links };
}

export function parseApiResponse<T>(payload: unknown): ApiResponse<T> {
  if (!isObject(payload)) {
    throw new Error("API payload is not a JSON object.");
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
  if (!isObject(payload)) {
    throw new Error("API payload is not a JSON object.");
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

  const meta = payload.meta;
  if (!isObject(meta)) {
    throw new Error("API payload list response is missing meta.");
  }

  const total = meta.total;
  const page = meta.page;
  const perPage = meta.per_page;
  const totalPages = meta.total_pages;

  const totalValue = isInteger(total) && total >= 0 ? total : undefined;
  const pageValue = isInteger(page) && page >= 1 ? page : undefined;
  const perPageValue = isInteger(perPage) && perPage >= 1 ? perPage : undefined;
  const totalPagesValue = isInteger(totalPages) && totalPages >= 0
    ? totalPages
    : undefined;

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
  const message = error instanceof Error ? error.message : "Invalid payload format.";
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

export function parseApiListResponseData<T>(payload: unknown): readonly T[] {
  return parseApiListResponse<T>(payload).data;
}

export function parseApiListResponseDataSafe<T>(
  payload: unknown,
  context: string,
): readonly T[] {
  return parseApiListResponseSafe<T>(payload, context).data;
}
