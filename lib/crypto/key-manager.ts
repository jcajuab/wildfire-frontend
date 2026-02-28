const DB_NAME = "wildfire-display-crypto";
const STORE_NAME = "ed25519_keypairs";

type StoredKeyPair = {
  alias: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  createdAt: string;
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "alias" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

const readStoredKeyPair = async (
  alias: string,
): Promise<StoredKeyPair | null> => {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(alias);
    request.onsuccess = () => {
      const value = request.result as StoredKeyPair | undefined;
      resolve(value ?? null);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to read keypair"));
    transaction.oncomplete = () => db.close();
  });
};

const writeStoredKeyPair = async (value: StoredKeyPair): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(value);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Failed to write keypair"));
  });
};

const encodeBase64 = (data: ArrayBuffer): string => {
  const bytes = new Uint8Array(data);
  let raw = "";
  bytes.forEach((byte) => {
    raw += String.fromCharCode(byte);
  });
  return btoa(raw);
};

const toBase64Url = (data: ArrayBuffer): string =>
  encodeBase64(data)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");

export async function getStoredDisplayKeyPair(
  alias: string,
): Promise<CryptoKeyPair | null> {
  const stored = await readStoredKeyPair(alias);
  if (!stored) {
    return null;
  }
  return {
    privateKey: stored.privateKey,
    publicKey: stored.publicKey,
  };
}

export async function getOrCreateDisplayKeyPair(
  alias: string,
): Promise<CryptoKeyPair> {
  const existing = await getStoredDisplayKeyPair(alias);
  if (existing) {
    return existing;
  }

  const keyPair = (await crypto.subtle.generateKey(
    { name: "Ed25519" } as AlgorithmIdentifier,
    false,
    ["sign", "verify"],
  )) as CryptoKeyPair;

  await writeStoredKeyPair({
    alias,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    createdAt: new Date().toISOString(),
  });

  return keyPair;
}

export async function exportPublicKeyPem(
  publicKey: CryptoKey,
): Promise<string> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  const base64 = encodeBase64(spki);
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

export async function signText(
  privateKey: CryptoKey,
  payload: string,
): Promise<string> {
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" } as AlgorithmIdentifier,
    privateKey,
    new TextEncoder().encode(payload),
  );
  return toBase64Url(signature);
}
