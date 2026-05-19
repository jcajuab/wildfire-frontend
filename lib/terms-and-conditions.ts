export const TERMS_AND_CONDITIONS_VERSION = "2026-05-20";
export const TERMS_ACCEPTANCE_CHANGE_EVENT = "wildfire:terms-acceptance-change";

const TERMS_ACCEPTANCE_STORAGE_PREFIX = "wildfire:terms-and-conditions:v1";

export interface TermsAcceptance {
  readonly acceptedAt: string;
  readonly version: string;
}

export interface TermsSection {
  readonly title: string;
  readonly body: readonly string[];
}

export const TERMS_AND_CONDITIONS_SECTIONS: readonly TermsSection[] = [
  {
    title: "1. Authorized Use",
    body: [
      "WILDFIRE is provided for DCISM department-wide digital signage, operational announcements, and approved administrative communication.",
      "Users must use the system only for department-related activity and must follow the permissions assigned to their account.",
    ],
  },
  {
    title: "2. Account Responsibility",
    body: [
      "Users are responsible for activity performed through their account and should not share login credentials with another person.",
      "If an account, password, or device may have been compromised, the user should report it to an administrator as soon as possible.",
    ],
  },
  {
    title: "3. Content Standards",
    body: [
      "Posted content must be complete, accurate, properly structured, and appropriate for display within the department environment.",
      "Each post or scheduled item should include clear title, message or playlist content, posting date and time, sender information, and the intended visibility duration when applicable.",
    ],
  },
  {
    title: "4. Scheduling Rules",
    body: [
      "Schedules should be created only for valid announcements, playlists, or operational needs.",
      "Users must not flood displays, repeatedly override scheduled content, reserve excessive time, or use scheduling to mislead viewers.",
    ],
  },
  {
    title: "5. Upload Rules",
    body: [
      "Uploaded files must be relevant to the announcement or playlist where they are used.",
      "Users must not upload harmful, offensive, copyrighted, unrelated, intentionally disruptive, or unnecessarily large files.",
    ],
  },
  {
    title: "6. Emergency and Critical Use",
    body: [
      "Emergency, critical, or high-priority messaging must be reserved for valid operational needs and time-sensitive department communication.",
      "Users must not apply urgent tones or emergency-style presentation to ordinary, misleading, or unrelated content.",
    ],
  },
  {
    title: "7. Message and Schedule Deletion Policy",
    body: [
      "The system may automatically delete finished schedules after the configured schedule retention period.",
      "Unused content may be deleted after it has not been used in playlists or schedules for the configured content retention period.",
      "Unused playlists may be deleted after they are no longer scheduled or active for the configured playlist retention period.",
      "Audit logs may be deleted after the configured audit-log retention period.",
      "Retention periods are configured by the admin account in Settings and may change as storage or operational requirements change.",
      "System cleanup runs automatically on a maintenance interval and may remove eligible records without additional user confirmation.",
      "Active or future references should keep related content available until those references are finished and the content becomes eligible for cleanup.",
      "WILDFIRE should not be treated as permanent archival storage for messages, media, playlists, schedules, or audit records.",
    ],
  },
  {
    title: "8. Audit and Monitoring",
    body: [
      "The system records administrative activity where supported, including authentication, content changes, schedule changes, settings changes, and cleanup-related events.",
      "Audit records are used for monitoring, troubleshooting, accountability, and compliance with department operating procedures.",
    ],
  },
  {
    title: "9. Acknowledgement",
    body: [
      "By continuing, the user confirms that they understand the appropriate-use rules, deletion behavior, retention policy, and audit expectations for the system.",
    ],
  },
];

export function getTermsAcceptanceStorageKey(userId: string): string {
  return `${TERMS_ACCEPTANCE_STORAGE_PREFIX}:${userId}`;
}

export function readTermsAcceptance(userId: string): TermsAcceptance | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      getTermsAcceptanceStorageKey(userId),
    );
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<TermsAcceptance>;
    if (
      parsed.version !== TERMS_AND_CONDITIONS_VERSION ||
      typeof parsed.acceptedAt !== "string"
    ) {
      return null;
    }
    return {
      acceptedAt: parsed.acceptedAt,
      version: parsed.version,
    };
  } catch {
    return null;
  }
}

export function writeTermsAcceptance(userId: string): TermsAcceptance {
  const acceptance = {
    acceptedAt: new Date().toISOString(),
    version: TERMS_AND_CONDITIONS_VERSION,
  };

  if (typeof window === "undefined") {
    return acceptance;
  }

  try {
    window.localStorage.setItem(
      getTermsAcceptanceStorageKey(userId),
      JSON.stringify(acceptance),
    );
  } catch {
    // Acceptance is intentionally local-only; storage failures should not crash.
  }
  window.dispatchEvent(new Event(TERMS_ACCEPTANCE_CHANGE_EVENT));

  return acceptance;
}
