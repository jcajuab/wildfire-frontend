const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export async function deriveDisplayFingerprint(input: {
  output: string;
  publicKeyPem: string;
}): Promise<string> {
  const payload = [
    "wildfire-display-fingerprint-v1",
    input.output.trim().toLowerCase(),
    input.publicKeyPem.trim(),
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(payload),
  );
  return toHex(new Uint8Array(digest));
}
