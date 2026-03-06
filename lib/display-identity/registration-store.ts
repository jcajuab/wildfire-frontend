export interface DisplayRegistrationRecord {
  readonly displayId: string;
  readonly slug: string;
  readonly keyId: string;
  readonly keyAlias: string;
  readonly fingerprint: string;
  readonly output: string;
  readonly registeredAt: string;
}

const STORAGE_KEY = "wildfire.displayRegistrations";

const readAll = (): DisplayRegistrationRecord[] => {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DisplayRegistrationRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (records: readonly DisplayRegistrationRecord[]): void => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

export function saveDisplayRegistration(
  record: DisplayRegistrationRecord,
): void {
  const all = readAll();
  const next = [...all.filter((item) => item.slug !== record.slug), record];
  writeAll(next);
}

export function getDisplayRegistrationBySlug(
  slug: string,
): DisplayRegistrationRecord | null {
  return readAll().find((item) => item.slug === slug) ?? null;
}

export function removeDisplayRegistration(slug: string): void {
  const next = readAll().filter((item) => item.slug !== slug);
  writeAll(next);
}
