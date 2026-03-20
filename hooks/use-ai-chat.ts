"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contentApi } from "@/lib/api/content-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import { schedulesApi } from "@/lib/api/schedules-api";
import { csrfHeaders } from "@/lib/api/auth-api";
import { useAppDispatch } from "@/lib/hooks";

interface UseAIChatOptions {
  provider: "openai" | "anthropic" | "google";
  model: string;
  conversationId: string;
}

type AffectedResourceType = "content" | "playlist" | "schedule";

export function useAIChat({
  provider,
  model,
  conversationId,
}: UseAIChatOptions) {
  const dispatch = useAppDispatch();
  const [input, setInput] = useState("");

  // Refs keep dynamic values accessible to the transport's
  // prepareSendMessagesRequest without causing stale closures.
  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    providerRef.current = provider;
    modelRef.current = model;
    conversationIdRef.current = conversationId;
  }, [provider, model, conversationId]);

  // The transport sends full UIMessage[] (including tool approval parts) so
  // the AI SDK's needsApproval round-trip works. prepareSendMessagesRequest
  // injects conversationId/provider/model into EVERY request (including
  // automatic re-sends triggered by sendAutomaticallyWhen after tool approval).
  /* eslint-disable react-hooks/refs -- refs are read inside a callback at request time, not during render */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: () => csrfHeaders(),
        prepareSendMessagesRequest: ({
          messages,
          body,
          id,
          trigger,
          messageId,
        }) => ({
          body: {
            ...(body as Record<string, unknown>),
            id,
            messages,
            trigger,
            messageId,
            conversationId: conversationIdRef.current,
            provider: providerRef.current,
            model: modelRef.current,
          },
        }),
      }),
    [],
  );
  /* eslint-enable react-hooks/refs */

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

  const { messages, status, error, sendMessage, addToolApprovalResponse } =
    useChat({
      transport,
      // After a tool approval response, automatically re-submit so the
      // server can execute the approved tool and continue the conversation.
      sendAutomaticallyWhen: ({ messages: msgs }) => {
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") return false;
        return lastMsg.parts.some(
          (p) =>
            "state" in p &&
            p.state === "approval-responded" &&
            "approval" in p &&
            p.approval != null &&
            typeof p.approval === "object" &&
            "approved" in p.approval &&
            p.approval.approved === true,
        );
      },
      onFinish: ({ messages: allMessages }) => {
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

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    error,
    addToolApprovalResponse,
  };
}
