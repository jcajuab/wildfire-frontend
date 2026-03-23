"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import {
  useGetAICredentialsQuery,
  useSaveAICredentialMutation,
  useDeleteAICredentialMutation,
  type AICredential,
} from "@/lib/api/ai-credentials-api";

export type { AICredential };

interface UseAICredentialsReturn {
  credentials: AICredential[];
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
  isDeleting: string | null;
  saveCredential: (provider: string, apiKey: string) => Promise<boolean>;
  deleteCredential: (provider: string) => Promise<boolean>;
  refetch: () => Promise<AICredential[]>;
}

export function useAICredentials(): UseAICredentialsReturn {
  const {
    data: credentials = [],
    isLoading,
    error: queryError,
    refetch,
  } = useGetAICredentialsQuery();

  const [saveAICredential, { isLoading: isSaving }] =
    useSaveAICredentialMutation();
  const [deleteAICredential, { isLoading: isDeletingAny, originalArgs }] =
    useDeleteAICredentialMutation();

  const error = queryError
    ? getApiErrorMessage(queryError, "Failed to load AI credentials.")
    : null;

  const saveCredential = useCallback(
    async (provider: string, apiKey: string): Promise<boolean> => {
      try {
        await saveAICredential({ provider, apiKey }).unwrap();
        toast.success(`${provider} API key saved.`);
        return true;
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to save API key.");
        toast.error(message);
        return false;
      }
    },
    [saveAICredential],
  );

  const deleteCredential = useCallback(
    async (provider: string): Promise<boolean> => {
      try {
        await deleteAICredential(provider).unwrap();
        toast.success(`${provider} API key removed.`);
        return true;
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to delete API key.");
        toast.error(message);
        return false;
      }
    },
    [deleteAICredential],
  );

  const refetchCredentials = useCallback(async (): Promise<AICredential[]> => {
    const result = await refetch();
    return result.data ?? [];
  }, [refetch]);

  return {
    credentials,
    isLoading,
    error,
    isSaving,
    isDeleting: isDeletingAny ? (originalArgs ?? null) : null,
    saveCredential,
    deleteCredential,
    refetch: refetchCredentials,
  };
}
