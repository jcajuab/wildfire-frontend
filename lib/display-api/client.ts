import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import { extractApiError, parseApiResponseData } from "@/lib/api/contracts";
import { createSignedHeaders } from "@/lib/crypto/request-signer";
import type { DisplayRegistrationRecord } from "@/lib/display-identity/registration-store";

export interface RegistrationSessionResponse {
  readonly registrationSessionId: string;
  readonly expiresAt: string;
  readonly challengeNonce: string;
  readonly constraints: DisplayRegistrationConstraints;
}

export interface DisplayRegistrationConstraints {
  readonly slugPattern: string;
  readonly minSlugLength: number;
  readonly maxSlugLength: number;
}

export interface RegisterDisplayResponse {
  readonly displayId: string;
  readonly slug: string;
  readonly state: "registered";
  readonly keyId: string;
}

export interface AuthChallengeResponse {
  readonly challengeToken: string;
  readonly expiresAt: string;
}

export interface ManifestItem {
  readonly id: string;
  readonly sequence: number;
  readonly duration: number;
  readonly content: {
    readonly id: string;
    readonly type: "IMAGE" | "VIDEO" | "PDF" | "TEXT";
    readonly checksum: string;
    readonly downloadUrl: string;
    readonly thumbnailUrl: string | null;
    readonly mimeType: string;
    readonly width: number | null;
    readonly height: number | null;
    readonly duration: number | null;
    readonly scrollPxPerSecond: number | null;
    readonly textHtmlContent: string | null;
  };
}

export interface DisplayManifest {
  readonly playlistId: string | null;
  readonly playlistVersion: string;
  readonly generatedAt: string;
  readonly runtimeSettings: {
    readonly scrollPxPerSecond: number;
  };
  readonly playback: {
    readonly mode: "SCHEDULE" | "EMERGENCY";
    readonly emergency: {
      readonly source: "DISPLAY" | "DEFAULT";
      readonly startedAt: string | null;
      readonly isGlobal: boolean;
      readonly content: ManifestItem["content"];
    } | null;
    readonly flash: {
      readonly scheduleId: string;
      readonly contentId: string;
      readonly message: string;
      readonly tone: "INFO" | "WARNING" | "CRITICAL";
      readonly region: "TOP_TICKER";
      readonly heightPx: number;
      readonly speedPxPerSecond: number;
    } | null;
  };
  readonly items: readonly ManifestItem[];
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  value != null && typeof value === "object" && !Array.isArray(value);

const isInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value);

const readRecord = (value: unknown, path: string): UnknownRecord => {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value;
};

const readString = (value: unknown, path: string): string => {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  return value;
};

const readNullableString = (value: unknown, path: string): string | null => {
  if (value === null) {
    return null;
  }
  return readString(value, path);
};

const readInteger = (value: unknown, path: string): number => {
  if (!isInteger(value)) {
    throw new Error(`${path} must be an integer`);
  }
  return value;
};

const readNullableInteger = (value: unknown, path: string): number | null => {
  if (value === null) {
    return null;
  }
  return readInteger(value, path);
};

const readBoolean = (value: unknown, path: string): boolean => {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }
  return value;
};

const readEnum = <T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] => {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`${path} must be one of: ${allowed.join(", ")}`);
  }
  return value as T[number];
};

const readUrl = (value: unknown, path: string): string => {
  const parsed = readString(value, path);
  try {
    // Ensure contract consistency for URL fields before runtime rendering.
    new URL(parsed);
    return parsed;
  } catch {
    throw new Error(`${path} must be a valid absolute URL`);
  }
};

const readOptionalNullableUrl = (
  value: unknown,
  path: string,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  return readUrl(value, path);
};

const parseDisplayRegistrationConstraints = (
  payload: unknown,
): DisplayRegistrationConstraints => {
  const root = readRecord(payload, "constraints");
  const slugPattern = readString(root.slugPattern, "constraints.slugPattern");
  const minSlugLength = readInteger(
    root.minSlugLength,
    "constraints.minSlugLength",
  );
  const maxSlugLength = readInteger(
    root.maxSlugLength,
    "constraints.maxSlugLength",
  );
  if (minSlugLength < 1) {
    throw new Error("constraints.minSlugLength must be positive");
  }
  if (maxSlugLength < minSlugLength) {
    throw new Error(
      "constraints.maxSlugLength must be greater than or equal to minSlugLength",
    );
  }
  return {
    slugPattern,
    minSlugLength,
    maxSlugLength,
  };
};

const parseRegistrationSessionResponse = (
  payload: unknown,
): RegistrationSessionResponse => {
  const root = readRecord(payload, "registrationSession");
  return {
    registrationSessionId: readString(
      root.registrationSessionId,
      "registrationSession.registrationSessionId",
    ),
    expiresAt: readString(root.expiresAt, "registrationSession.expiresAt"),
    challengeNonce: readString(
      root.challengeNonce,
      "registrationSession.challengeNonce",
    ),
    constraints: parseDisplayRegistrationConstraints(root.constraints),
  };
};

const parseRegisterDisplayResponse = (
  payload: unknown,
): RegisterDisplayResponse => {
  const root = readRecord(payload, "registerDisplay");
  return {
    displayId: readString(root.displayId, "registerDisplay.displayId"),
    slug: readString(root.slug, "registerDisplay.slug"),
    keyId: readString(root.keyId, "registerDisplay.keyId"),
    state: readEnum(
      root.state,
      ["registered"] as const,
      "registerDisplay.state",
    ),
  };
};

const parseAuthChallengeResponse = (
  payload: unknown,
): AuthChallengeResponse => {
  const root = readRecord(payload, "authChallenge");
  return {
    challengeToken: readString(root.challengeToken, "challengeToken"),
    expiresAt: readString(root.expiresAt, "expiresAt"),
  };
};

const parseManifestItemContent = (
  payload: unknown,
  path: string,
): ManifestItem["content"] => {
  const root = readRecord(payload, path);
  const contentType = readEnum(
    root.type,
    ["IMAGE", "VIDEO", "PDF", "TEXT"] as const,
    `${path}.type`,
  );
  return {
    id: readString(root.id, `${path}.id`),
    type: contentType,
    checksum: readString(root.checksum, `${path}.checksum`),
    downloadUrl:
      contentType === "TEXT"
        ? ""
        : readUrl(root.downloadUrl, `${path}.downloadUrl`),
    thumbnailUrl: readOptionalNullableUrl(
      root.thumbnailUrl,
      `${path}.thumbnailUrl`,
    ),
    mimeType: readString(root.mimeType, `${path}.mimeType`),
    width: readNullableInteger(root.width, `${path}.width`),
    height: readNullableInteger(root.height, `${path}.height`),
    duration: readNullableInteger(root.duration, `${path}.duration`),
    scrollPxPerSecond: readNullableInteger(
      root.scrollPxPerSecond,
      `${path}.scrollPxPerSecond`,
    ),
    textHtmlContent: readNullableString(
      root.textHtmlContent,
      `${path}.textHtmlContent`,
    ),
  };
};

const parseManifestItem = (payload: unknown, path: string): ManifestItem => {
  const root = readRecord(payload, path);
  return {
    id: readString(root.id, `${path}.id`),
    sequence: readInteger(root.sequence, `${path}.sequence`),
    duration: readInteger(root.duration, `${path}.duration`),
    content: parseManifestItemContent(root.content, `${path}.content`),
  };
};

const parseEmergencyPlayback = (
  payload: unknown,
  path: string,
): DisplayManifest["playback"]["emergency"] => {
  if (payload === null) {
    return null;
  }
  const root = readRecord(payload, path);
  return {
    source: readEnum(
      root.source,
      ["DISPLAY", "DEFAULT"] as const,
      `${path}.source`,
    ),
    startedAt: readNullableString(root.startedAt, `${path}.startedAt`),
    isGlobal: readBoolean(root.isGlobal, `${path}.isGlobal`),
    content: parseManifestItemContent(root.content, `${path}.content`),
  };
};

const parseFlashPlayback = (
  payload: unknown,
  path: string,
): DisplayManifest["playback"]["flash"] => {
  if (payload === null) {
    return null;
  }
  const root = readRecord(payload, path);
  return {
    scheduleId: readString(root.scheduleId, `${path}.scheduleId`),
    contentId: readString(root.contentId, `${path}.contentId`),
    message: readString(root.message, `${path}.message`),
    tone: readEnum(
      root.tone,
      ["INFO", "WARNING", "CRITICAL"] as const,
      `${path}.tone`,
    ),
    region: readEnum(root.region, ["TOP_TICKER"] as const, `${path}.region`),
    heightPx: readInteger(root.heightPx, `${path}.heightPx`),
    speedPxPerSecond: readInteger(
      root.speedPxPerSecond,
      `${path}.speedPxPerSecond`,
    ),
  };
};

const parseDisplayManifest = (payload: unknown): DisplayManifest => {
  const root = readRecord(payload, "manifest");
  const runtimeSettings = readRecord(
    root.runtimeSettings,
    "manifest.runtimeSettings",
  );
  const playback = readRecord(root.playback, "manifest.playback");
  const rawItems = root.items;
  if (!Array.isArray(rawItems)) {
    throw new Error("manifest.items must be an array");
  }

  return {
    playlistId: readNullableString(root.playlistId, "manifest.playlistId"),
    playlistVersion: readString(
      root.playlistVersion,
      "manifest.playlistVersion",
    ),
    generatedAt: readString(root.generatedAt, "manifest.generatedAt"),
    runtimeSettings: {
      scrollPxPerSecond: readInteger(
        runtimeSettings.scrollPxPerSecond,
        "manifest.runtimeSettings.scrollPxPerSecond",
      ),
    },
    playback: {
      mode: readEnum(
        playback.mode,
        ["SCHEDULE", "EMERGENCY"] as const,
        "manifest.playback.mode",
      ),
      emergency: parseEmergencyPlayback(
        playback.emergency,
        "manifest.playback.emergency",
      ),
      flash: parseFlashPlayback(playback.flash, "manifest.playback.flash"),
    },
    items: rawItems.map((item, index) =>
      parseManifestItem(item, `manifest.items[${index}]`),
    ),
  };
};

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as unknown;
    return (
      extractApiError(payload)?.error.message ??
      `Request failed with status ${response.status}`
    );
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const getRequiredBaseUrl = (): string => {
  return getBaseUrl();
};

export async function createRegistrationSession(
  registrationCode: string,
): Promise<RegistrationSessionResponse> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(`${baseUrl}/displays/registration-sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify({ registrationCode }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return parseRegistrationSessionResponse(
    parseApiResponseData<unknown>(await response.json()),
  );
}

export async function fetchDisplayRegistrationConstraints(): Promise<DisplayRegistrationConstraints> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(`${baseUrl}/displays/registration-constraints`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...getDevOnlyRequestHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return parseDisplayRegistrationConstraints(
    parseApiResponseData<unknown>(await response.json()),
  );
}

export async function registerDisplay(input: {
  registrationSessionId: string;
  slug: string;
  displayName: string;
  resolutionWidth: number;
  resolutionHeight: number;
  output: string;
  fingerprint: string;
  publicKey: string;
  keyAlgorithm: "ed25519";
  registrationSignature: string;
}): Promise<RegisterDisplayResponse> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(`${baseUrl}/displays/registrations`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return parseRegisterDisplayResponse(
    parseApiResponseData<unknown>(await response.json()),
  );
}

export async function createAuthChallenge(input: {
  slug: string;
  keyId: string;
}): Promise<AuthChallengeResponse> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(`${baseUrl}/display-runtime/auth/challenges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getDevOnlyRequestHeaders(),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return parseAuthChallengeResponse(
    parseApiResponseData<unknown>(await response.json()),
  );
}

export async function verifyAuthChallenge(input: {
  challengeToken: string;
  slug: string;
  keyId: string;
  signature: string;
}): Promise<void> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(
    `${baseUrl}/display-runtime/auth/challenges/${encodeURIComponent(input.challengeToken)}/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getDevOnlyRequestHeaders(),
      },
      body: JSON.stringify({
        slug: input.slug,
        keyId: input.keyId,
        signature: input.signature,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}

export async function fetchSignedManifest(input: {
  registration: DisplayRegistrationRecord;
  privateKey: CryptoKey;
}): Promise<DisplayManifest> {
  const baseUrl = getRequiredBaseUrl();
  const url = `${baseUrl}/display-runtime/${encodeURIComponent(input.registration.slug)}/manifest`;
  const signedHeaders = await createSignedHeaders({
    method: "GET",
    url,
    slug: input.registration.slug,
    keyId: input.registration.keyId,
    privateKey: input.privateKey,
    body: "",
  });

  const response = await fetch(url, {
    method: "GET",
    headers: signedHeaders,
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  return parseDisplayManifest(
    parseApiResponseData<unknown>(await response.json()),
  );
}

export async function postSignedHeartbeat(input: {
  registration: DisplayRegistrationRecord;
  privateKey: CryptoKey;
}): Promise<void> {
  const baseUrl = getRequiredBaseUrl();
  const url = `${baseUrl}/display-runtime/${encodeURIComponent(input.registration.slug)}/heartbeat`;
  const signedHeaders = await createSignedHeaders({
    method: "POST",
    url,
    slug: input.registration.slug,
    keyId: input.registration.keyId,
    privateKey: input.privateKey,
    body: "",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: signedHeaders,
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}

export async function postSignedSnapshot(input: {
  registration: DisplayRegistrationRecord;
  privateKey: CryptoKey;
  imageDataUrl: string;
  capturedAt?: string;
}): Promise<void> {
  const baseUrl = getRequiredBaseUrl();
  const url = `${baseUrl}/display-runtime/${encodeURIComponent(input.registration.slug)}/snapshot`;
  const body = JSON.stringify({
    imageDataUrl: input.imageDataUrl,
    ...(input.capturedAt ? { capturedAt: input.capturedAt } : {}),
  });
  const signedHeaders = await createSignedHeaders({
    method: "POST",
    url,
    slug: input.registration.slug,
    keyId: input.registration.keyId,
    privateKey: input.privateKey,
    body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...signedHeaders,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
}
