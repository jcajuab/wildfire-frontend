import {
  type BaseQueryFn,
  fetchBaseQuery,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/config";
import {
  getAuthorizationHeaderValue,
  refreshAccessToken,
  shouldRefreshAccessToken,
} from "@/lib/auth-session";

export { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/config";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getBaseUrl(),
  credentials: "same-origin",
});

function withAuthHeaders(args: string | FetchArgs): FetchArgs {
  const headers = new Headers(
    typeof args === "string" ? undefined : (args.headers as HeadersInit),
  );

  Object.entries(getDevOnlyRequestHeaders()).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const authorization = getAuthorizationHeaderValue();
  if (authorization != null) {
    headers.set("Authorization", authorization);
  }

  if (typeof args === "string") {
    return { url: args, headers };
  }

  return {
    ...args,
    headers,
  };
}

export const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  if (shouldRefreshAccessToken()) {
    try {
      await refreshAccessToken();
    } catch {
      // Fall through and let the request try with the current in-memory token.
    }
  }

  const execute = () => rawBaseQuery(withAuthHeaders(args), api, extraOptions);

  let result = await execute();
  if (result.error?.status !== 401) {
    return result;
  }

  try {
    await refreshAccessToken();
  } catch {
    return result;
  }

  result = await execute();
  return result;
};
