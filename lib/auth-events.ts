export const AUTH_API_ERROR_EVENT = "wildfire:auth-api-error";
export const AUTH_REFRESH_REQUEST_EVENT = "wildfire:auth-refresh-request";

export interface AuthApiErrorEventDetail {
  readonly status: number;
  readonly url: string;
  readonly method: string;
}

function canDispatchDomEvent(): boolean {
  return typeof window !== "undefined";
}

export function emitAuthRefreshRequested(): void {
  if (!canDispatchDomEvent()) return;
  window.dispatchEvent(new CustomEvent(AUTH_REFRESH_REQUEST_EVENT));
}
