/**
 * Shape of the backend error response body (error.message is the user-facing string).
 * Other mutation catch blocks (content, users, roles, displays, settings, logs, etc.)
 * can use this helper so backend messages are consistently shown in toasts.
 */
interface ApiErrorBody {
  error?: { message?: string };
}

/**
 * Extracts the user-facing error message from a thrown value (e.g. from RTK Query mutation unwrap()).
 * RTK Query often throws an object with `status` and `data` (parsed JSON), not an Error instance.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (typeof data === "object" && data !== null) {
      const message = (data as ApiErrorBody).error?.message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
