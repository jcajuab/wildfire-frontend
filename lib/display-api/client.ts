import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";
import { extractApiError, parseApiResponseData } from "@/lib/api/contracts";
import { createSignedHeaders } from "@/lib/crypto/request-signer";
import type { DisplayRegistrationRecord } from "@/lib/display-identity/registration-store";

export interface RegistrationSessionResponse {
  readonly registrationSessionId: string;
  readonly expiresAt: string;
  readonly challengeNonce: string;
  readonly constraints: {
    readonly displaySlugPattern: string;
    readonly minSlugLength: number;
    readonly maxSlugLength: number;
  };
}

export interface RegisterDisplayResponse {
  readonly displayId: string;
  readonly displaySlug: string;
  readonly state: "registered" | "active";
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
    readonly type: "IMAGE" | "VIDEO" | "PDF";
    readonly checksum: string;
    readonly downloadUrl: string;
    readonly mimeType: string;
    readonly width: number | null;
    readonly height: number | null;
    readonly duration: number | null;
  };
}

export interface DisplayManifest {
  readonly playlistId: string | null;
  readonly playlistVersion: string;
  readonly generatedAt: string;
  readonly runtimeSettings: {
    readonly scrollPxPerSecond: number;
  };
  readonly items: readonly ManifestItem[];
}

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
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }
  return baseUrl;
};

export async function createRegistrationSession(
  registrationCode: string,
): Promise<RegistrationSessionResponse> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(
    `${baseUrl}/display-runtime/registration-sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getDevOnlyRequestHeaders(),
      },
      body: JSON.stringify({ registrationCode }),
    },
  );

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return parseApiResponseData<RegistrationSessionResponse>(
    await response.json(),
  );
}

export async function registerDisplay(input: {
  registrationSessionId: string;
  displaySlug: string;
  displayName: string;
  resolutionWidth: number;
  resolutionHeight: number;
  displayOutput: string;
  displayFingerprint: string;
  publicKey: string;
  keyAlgorithm: "ed25519";
  registrationSignature: string;
}): Promise<RegisterDisplayResponse> {
  const baseUrl = getRequiredBaseUrl();
  const response = await fetch(`${baseUrl}/display-runtime/registrations`, {
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

  return parseApiResponseData<RegisterDisplayResponse>(await response.json());
}

export async function createAuthChallenge(input: {
  displaySlug: string;
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

  return parseApiResponseData<AuthChallengeResponse>(await response.json());
}

export async function verifyAuthChallenge(input: {
  challengeToken: string;
  displaySlug: string;
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
        displaySlug: input.displaySlug,
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
  const url = `${baseUrl}/display-runtime/${encodeURIComponent(input.registration.displaySlug)}/manifest`;
  const signedHeaders = await createSignedHeaders({
    method: "GET",
    url,
    displaySlug: input.registration.displaySlug,
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
  return parseApiResponseData<DisplayManifest>(await response.json());
}

export async function postSignedHeartbeat(input: {
  registration: DisplayRegistrationRecord;
  privateKey: CryptoKey;
}): Promise<void> {
  const baseUrl = getRequiredBaseUrl();
  const url = `${baseUrl}/display-runtime/${encodeURIComponent(input.registration.displaySlug)}/heartbeat`;
  const signedHeaders = await createSignedHeaders({
    method: "POST",
    url,
    displaySlug: input.registration.displaySlug,
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
