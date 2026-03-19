"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getBaseUrl } from "@/lib/api/base-query";
import { contentApi } from "@/lib/api/content-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import { schedulesApi } from "@/lib/api/schedules-api";
import { useAppDispatch } from "@/lib/hooks";

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

type AffectedResourceType = PendingAction["resourceType"];

export function useAIChat({
  provider,
  model,
  conversationId,
}: UseAIChatOptions) {
  const { token } = useAuth();
  const dispatch = useAppDispatch();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");

  const fetchPendingActions = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${getBaseUrl()}/ai/pending-actions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (
        data !== null &&
        typeof data === "object" &&
        "data" in data &&
        Array.isArray((data as { data: unknown }).data)
      ) {
        setPendingActions((data as { data: PendingAction[] }).data);
      }
    } catch {
      // silently ignore fetch errors for pending actions
    }
  }, [token]);

  // Transport handles message serialization only. Dynamic values (provider,
  // model, etc.) are passed via sendMessage's request-level body options to
  // avoid stale closures — per AI SDK's recommended pattern.
  // See: https://ai-sdk.dev/docs/troubleshooting/use-chat-stale-body-data
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: token != null ? { Authorization: `Bearer ${token}` } : {},
        prepareSendMessagesRequest: ({
          messages,
          body,
        }): { body: Record<string, unknown> } => {
          const serialized = messages
            .map((msg) => {
              const textParts = msg.parts
                .filter(
                  (p): p is { type: "text"; text: string } => p.type === "text",
                )
                .map((p) => p.text);
              const content = textParts.join("");
              if (content.length === 0) return null;
              return {
                role: msg.role as "user" | "assistant" | "system",
                content,
              };
            })
            .filter(
              (
                msg,
              ): msg is {
                role: "user" | "assistant" | "system";
                content: string;
              } => msg !== null,
            );
          return {
            body: {
              ...(body as Record<string, unknown>),
              messages: serialized,
            },
          };
        },
      }),
    [token],
  );

  // Map AI tool names to affected resource types for smart cache invalidation.
  // When the AI finishes, we invalidate only the entity tags that the
  // tool calls could have affected.
  const getAffectedResourceTypesFromParts = useCallback(
    (assistantParts: Array<{ type: string; toolName?: string }>) => {
      const resourceTypes = new Set<AffectedResourceType>();
      for (const part of assistantParts) {
        // Dynamic tools have toolName directly; typed tools encode it in type as "tool-{name}".
        const name =
          ("toolName" in part ? part.toolName : undefined) ??
          (part.type.startsWith("tool-") ? part.type.slice(5) : undefined);
        if (!name) continue;
        if (name.includes("content")) resourceTypes.add("content");
        if (name.includes("playlist")) resourceTypes.add("playlist");
        if (name.includes("schedule")) resourceTypes.add("schedule");
      }
      return resourceTypes;
    },
    [],
  );

  const invalidateAffectedTags = useCallback(
    (resourceTypes: ReadonlySet<AffectedResourceType>) => {
      if (resourceTypes.has("content")) {
        dispatch(
          contentApi.util.invalidateTags([{ type: "Content", id: "LIST" }]),
        );
      }
      if (resourceTypes.has("playlist")) {
        dispatch(
          playlistsApi.util.invalidateTags([{ type: "Playlist", id: "LIST" }]),
        );
      }
      if (resourceTypes.has("schedule")) {
        dispatch(
          schedulesApi.util.invalidateTags([{ type: "Schedule", id: "LIST" }]),
        );
      }
    },
    [dispatch],
  );

  const { messages, status, error, sendMessage } = useChat({
    transport,
    onFinish: ({ messages: allMessages }) => {
      void fetchPendingActions();
      // Collect tool parts from ALL assistant messages (not just the last one)
      // because multi-step chains place tool calls in intermediate messages.
      const toolParts = allMessages
        .filter((m) => m.role === "assistant")
        .flatMap((m) => m.parts);
      invalidateAffectedTags(getAffectedResourceTypesFromParts(toolParts));
    },
  });

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;

      // Pass dynamic values at request time — always fresh, never stale.
      void sendMessage(
        { text: trimmed },
        {
          body: {
            conversationId,
            provider,
            model,
          },
        },
      );
      setInput("");
    },
    [input, sendMessage, conversationId, provider, model],
  );

  const confirmAction = useCallback(
    async (action: PendingAction, approved: boolean) => {
      if (!token) return;
      const response = await fetch(
        `${getBaseUrl()}/ai/pending-actions/${action.token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ conversationId, approved }),
        },
      );
      if (!response.ok) {
        console.error(
          `[confirmAction] failed with status ${String(response.status)}`,
        );
        return;
      }
      if (approved) {
        invalidateAffectedTags(new Set([action.resourceType]));
      }
      void fetchPendingActions();
    },
    [conversationId, fetchPendingActions, invalidateAffectedTags, token],
  );

  const cancelAction = useCallback(
    async (actionToken: string) => {
      if (!token) return;
      const response = await fetch(
        `${getBaseUrl()}/ai/pending-actions/${actionToken}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        console.error(
          `[cancelAction] failed with status ${String(response.status)}`,
        );
        return;
      }
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
