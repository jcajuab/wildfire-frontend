export interface LogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly authorId: string;
  readonly authorName: string;
  /** Presigned avatar URL when the author is a user with a profile picture. */
  readonly authorAvatarUrl?: string | null;
  /** Human-readable summary for non-technical admins. */
  readonly description: string;
  /** Technical request descriptor retained for advanced troubleshooting. */
  readonly technicalDescription: string;
  /** Curated metadata shown in the default audit view. */
  readonly metadata: Record<string, unknown>;
  /** Full metadata payload shown in advanced mode. */
  readonly rawMetadata: Record<string, unknown>;
}
