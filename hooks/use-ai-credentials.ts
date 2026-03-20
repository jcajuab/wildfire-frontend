"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { csrfHeaders } from "@/lib/api/auth-api";
import { getBaseUrl, getDevOnlyRequestHeaders } from "@/lib/api/base-query";

export interface AICredential {
  provider: string;
  keyHint: string;
}

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
  const [credentials, setCredentials] = useState<AICredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchCredentials = useCallback(async (): Promise<AICredential[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getBaseUrl()}/ai/credentials`, {
        credentials: "include",
        headers: { ...getDevOnlyRequestHeaders() },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = (await response.json()) as {
        data: Array<{ provider: string; keyHint: string }>;
      };
      const result = json.data ?? [];
      setCredentials(result);
      return result;
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load AI credentials.");
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  const saveCredential = useCallback(
    async (provider: string, apiKey: string): Promise<boolean> => {
      setIsSaving(true);
      try {
        const response = await fetch(`${getBaseUrl()}/ai/credentials`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getDevOnlyRequestHeaders(),
            ...csrfHeaders(),
          },
          body: JSON.stringify({ provider, apiKey }),
        });
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          throw payload ?? new Error(`HTTP ${response.status}`);
        }
        toast.success(`${provider} API key saved.`);
        await fetchCredentials();
        return true;
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to save API key.");
        toast.error(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [fetchCredentials],
  );

  const deleteCredential = useCallback(
    async (provider: string): Promise<boolean> => {
      setIsDeleting(provider);
      try {
        const response = await fetch(
          `${getBaseUrl()}/ai/credentials/${provider}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { ...getDevOnlyRequestHeaders(), ...csrfHeaders() },
          },
        );
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          throw payload ?? new Error(`HTTP ${response.status}`);
        }
        toast.success(`${provider} API key removed.`);
        await fetchCredentials();
        return true;
      } catch (err) {
        const message = getApiErrorMessage(err, "Failed to delete API key.");
        toast.error(message);
        return false;
      } finally {
        setIsDeleting(null);
      }
    },
    [fetchCredentials],
  );

  return {
    credentials,
    isLoading,
    error,
    isSaving,
    isDeleting,
    saveCredential,
    deleteCredential,
    refetch: fetchCredentials,
  };
}
