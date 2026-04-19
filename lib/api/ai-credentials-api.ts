import { parseApiResponseDataSafe } from "@/lib/api/contracts";
import { api } from "@/lib/api/api";

export interface AICredential {
  readonly provider: string;
  readonly keyHint: string;
}

export const aiCredentialsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAICredentials: build.query<AICredential[], void>({
      query: () => "ai/credentials",
      transformResponse: (response) =>
        parseApiResponseDataSafe<AICredential[]>(response, "getAICredentials"),
      providesTags: [{ type: "AICredential", id: "LIST" }],
    }),
    saveAICredential: build.mutation<
      void,
      { provider: string; apiKey: string }
    >({
      query: (body) => ({
        url: "ai/credentials",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "AICredential", id: "LIST" }],
    }),
    deleteAICredential: build.mutation<void, string>({
      query: (provider) => ({
        url: `ai/credentials/${encodeURIComponent(provider)}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "AICredential", id: "LIST" }],
    }),
  }),
});

export const {
  useGetAICredentialsQuery,
  useSaveAICredentialMutation,
  useDeleteAICredentialMutation,
} = aiCredentialsApi;
