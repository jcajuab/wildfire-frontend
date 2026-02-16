export interface LogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly authorId: string;
  readonly authorName: string;
  /** Presigned avatar URL when the author is a user with a profile picture. */
  readonly authorAvatarUrl?: string | null;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
}
