const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export async function deriveDisplayFingerprint(input: {
  machineId: string;
  displayOutput: string;
}): Promise<string> {
  const payload = [
    input.machineId.trim(),
    input.displayOutput.trim().toLowerCase(),
    navigator.userAgent,
    navigator.language,
  ].join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(payload),
  );
  return toHex(new Uint8Array(digest));
}
