export function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as {
    status?: number | string;
    originalStatus?: number | string;
  };

  return candidate.status === 404 || candidate.originalStatus === 404;
}
