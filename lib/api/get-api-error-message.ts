import { extractApiError } from "@/lib/api/contracts";

/**
 * Extracts the user-facing error message from a thrown value (e.g. from RTK Query mutation unwrap()).
 * RTK Query often throws an object with `status` and `data` (parsed JSON), not an Error instance.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data: unknown }).data;
    const apiError = extractApiError(data);
    if (apiError?.error?.message) {
      return apiError.error.message;
    }

    if (
      data !== null &&
      typeof data === "object" &&
      typeof (data as { message?: unknown }).message === "string" &&
      typeof (data as { code?: unknown }).code === "string"
    ) {
      return (data as { message: string }).message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}
