"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/auth-context";
import { getApiErrorMessage } from "@/lib/api/get-api-error-message";
import { getBaseUrl } from "@/lib/api/base-query";

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
  const { token } = useAuth();
  const [credentials, setCredentials] = useState<AICredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchCredentials = useCallback(async (): Promise<AICredential[]> => {
    if (!token) return [];
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getBaseUrl()}/ai/credentials`, {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [token]);

  useEffect(() => {
    void fetchCredentials();
  }, [fetchCredentials]);

  const saveCredential = useCallback(
    async (provider: string, apiKey: string): Promise<boolean> => {
      if (!token) return false;
      setIsSaving(true);
      try {
        const response = await fetch(`${getBaseUrl()}/ai/credentials`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    [token, fetchCredentials],
  );

  const deleteCredential = useCallback(
    async (provider: string): Promise<boolean> => {
      if (!token) return false;
      setIsDeleting(provider);
      try {
        const response = await fetch(
          `${getBaseUrl()}/ai/credentials/${provider}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
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
    [token, fetchCredentials],
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
