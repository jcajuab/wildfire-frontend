import { getDevOnlyRequestHeaders } from "@/lib/api/base-query";

const textEncoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array): string => {
  let raw = "";
  bytes.forEach((byte) => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw);
};

const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");

const digestSha256Base64Url = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(value),
  );
  return toBase64Url(new Uint8Array(digest));
};

const signPayload = async (
  privateKey: CryptoKey,
  payload: string,
): Promise<string> => {
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" } as AlgorithmIdentifier,
    privateKey,
    textEncoder.encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
};

export async function createSignedHeaders(input: {
  method: string;
  url: string;
  displaySlug: string;
  keyId: string;
  privateKey: CryptoKey;
  body?: string;
}): Promise<Record<string, string>> {
  const body = input.body ?? "";
  const bodyHash = await digestSha256Base64Url(body);
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();

  const url = new URL(input.url);
  const pathWithQuery = `${url.pathname}${url.search}`;
  const payload = [
    input.method.toUpperCase(),
    pathWithQuery,
    input.displaySlug,
    input.keyId,
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");

  const signature = await signPayload(input.privateKey, payload);

  return {
    ...getDevOnlyRequestHeaders(),
    "x-display-slug": input.displaySlug,
    "x-display-key-id": input.keyId,
    "x-display-timestamp": timestamp,
    "x-display-nonce": nonce,
    "x-display-body-sha256": bodyHash,
    "x-display-signature": signature,
  };
}
