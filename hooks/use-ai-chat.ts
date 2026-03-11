"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/auth-context";

export interface PendingAction {
  token: string;
  actionType: "edit" | "delete";
  resourceType: "content" | "playlist" | "schedule";
  summary: string;
  expiresAt: string;
}

interface UseAIChatOptions {
  provider: "openai" | "anthropic" | "google";
  model: string;
  conversationId: string;
}

export function useAIChat({
  provider,
  model,
  conversationId,
}: UseAIChatOptions) {
  const { token } = useAuth();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");

  const fetchPendingActions = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/ai/pending-actions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return;
      const data = (await response.json()) as { data?: PendingAction[] };
      setPendingActions(data.data ?? []);
    } catch {
      // silently ignore fetch errors for pending actions
    }
  }, [token]);

  const { messages, status, error, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      headers: token != null ? { Authorization: `Bearer ${token}` } : {},
      body: {
        provider,
        model,
        conversationId,
      },
    }),
    onFinish: () => {
      void fetchPendingActions();
    },
  });

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;
      void sendMessage({ text: trimmed });
      setInput("");
    },
    [input, sendMessage],
  );

  const confirmAction = useCallback(
    async (actionToken: string, approved: boolean) => {
      if (!token) return;
      await fetch("/api/ai/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: actionToken, conversationId, approved }),
      });
      void fetchPendingActions();
    },
    [conversationId, fetchPendingActions, token],
  );

  const cancelAction = useCallback(
    async (actionToken: string) => {
      if (!token) return;
      await fetch(`/api/ai/pending-actions/${actionToken}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      void fetchPendingActions();
    },
    [fetchPendingActions, token],
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    error,
    pendingActions,
    confirmAction,
    cancelAction,
  };
}
