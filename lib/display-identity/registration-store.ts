export interface DisplayRegistrationRecord {
  readonly displayId: string;
  readonly displaySlug: string;
  readonly keyId: string;
  readonly keyAlias: string;
  readonly displayFingerprint: string;
  readonly displayOutput: string;
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
  const next = [
    ...all.filter((item) => item.displaySlug !== record.displaySlug),
    record,
  ];
  writeAll(next);
}

export function getDisplayRegistrationBySlug(
  displaySlug: string,
): DisplayRegistrationRecord | null {
  return readAll().find((item) => item.displaySlug === displaySlug) ?? null;
}

export function removeDisplayRegistration(displaySlug: string): void {
  const next = readAll().filter((item) => item.displaySlug !== displaySlug);
  writeAll(next);
}
