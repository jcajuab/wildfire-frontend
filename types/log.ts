export interface LogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly description: string;
  readonly metadata: Record<string, unknown>;
}
