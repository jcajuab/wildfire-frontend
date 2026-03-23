export const toBase64 = (bytes: Uint8Array): string => {
  let raw = "";
  bytes.forEach((byte) => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw);
};

export const toBase64Url = (data: ArrayBuffer | Uint8Array): string =>
  toBase64(data instanceof Uint8Array ? data : new Uint8Array(data))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
