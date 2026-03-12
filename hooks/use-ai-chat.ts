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
import { SLASH_COMMANDS, type SlashCommand } from "@/lib/slash-commands";

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
  const dispatch = useAppDispatch();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [input, setInput] = useState("");
  const [selectedTools, setSelectedTools] = useState<SlashCommand[]>([]);

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

  // Map AI tool names to RTK Query tags for smart cache invalidation.
  // When the AI finishes, we invalidate only the entity tags that the
  // tool calls could have affected.
  const invalidateAffectedTags = useCallback(
    (assistantParts: Array<{ type: string; toolName?: string }>) => {
      const tags = new Set<"Content" | "Playlist" | "Schedule">();
      for (const part of assistantParts) {
        // Dynamic tools have toolName directly; typed tools encode it in type as "tool-{name}"
        const name =
          ("toolName" in part ? part.toolName : undefined) ??
          (part.type.startsWith("tool-") ? part.type.slice(5) : undefined);
        if (!name) continue;
        if (name.includes("content")) tags.add("Content");
        if (name.includes("playlist")) tags.add("Playlist");
        if (name.includes("schedule")) tags.add("Schedule");
      }
      if (tags.has("Content")) {
        dispatch(
          contentApi.util.invalidateTags([{ type: "Content", id: "LIST" }]),
        );
      }
      if (tags.has("Playlist")) {
        dispatch(
          playlistsApi.util.invalidateTags([{ type: "Playlist", id: "LIST" }]),
        );
      }
      if (tags.has("Schedule")) {
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
      invalidateAffectedTags(toolParts);
    },
  });

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;

      // Extract slash commands from the input text
      const commandMatches = trimmed.match(/\/[\w-]+/g) ?? [];
      const extractedToolNames = commandMatches
        .map((cmd) => {
          const id = cmd.slice(1);
          const slashCmd = SLASH_COMMANDS.find((sc) => sc.id === id);
          return slashCmd?.toolName;
        })
        .filter((name): name is string => name != null);

      // Pass dynamic values at request time — always fresh, never stale.
      void sendMessage(
        { text: trimmed },
        {
          body: {
            conversationId,
            provider,
            model,
            ...(extractedToolNames.length > 0
              ? { toolNames: extractedToolNames }
              : {}),
          },
        },
      );
      setInput("");
      setSelectedTools([]);
    },
    [input, sendMessage, conversationId, provider, model],
  );

  const addTool = useCallback(
    (command: SlashCommand) => {
      if (!selectedTools.some((t) => t.id === command.id)) {
        setSelectedTools((prev) => [...prev, command]);
      }
    },
    [selectedTools],
  );

  const removeTool = useCallback((commandId: string) => {
    setSelectedTools((prev) => prev.filter((t) => t.id !== commandId));
  }, []);

  const confirmAction = useCallback(
    async (actionToken: string, approved: boolean) => {
      if (!token) return;
      const response = await fetch(`${getBaseUrl()}/ai/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: actionToken, conversationId, approved }),
      });
      if (!response.ok) {
        console.error(
          `[confirmAction] failed with status ${String(response.status)}`,
        );
        return;
      }
      void fetchPendingActions();
    },
    [conversationId, fetchPendingActions, token],
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
    selectedTools,
    addTool,
    removeTool,
  };
}
