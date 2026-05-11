"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBaseUrl } from "@/lib/api/config";
import { contentApi } from "@/lib/api/content-api";
import { playlistsApi } from "@/lib/api/playlists-api";
import { revalidateWildfireTagsViaRoute } from "@/lib/api/revalidate-via-route";
import { schedulesApi } from "@/lib/api/schedules-api";
import { getAuthorizationHeaders } from "@/lib/auth-session";
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

  const providerRef = useRef(provider);
  const modelRef = useRef(model);
  const conversationIdRef = useRef(conversationId);
  useEffect(() => {
    providerRef.current = provider;
    modelRef.current = model;
    conversationIdRef.current = conversationId;
  }, [provider, model, conversationId]);

  /* eslint-disable react-hooks/refs -- refs are read inside a callback at request time, not during render */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${getBaseUrl()}/ai/chat`,
        headers: () => getAuthorizationHeaders(),
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

  const getAffectedResourceTypesFromParts = useCallback(
    (assistantParts: Array<{ type: string; toolName?: string }>) => {
      const resourceTypes = new Set<AffectedResourceType>();
      for (const part of assistantParts) {
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

  const refreshAffectedCaches = useCallback(
    async (resourceTypes: ReadonlySet<AffectedResourceType>) => {
      const serverTags = new Set<
        Parameters<typeof revalidateWildfireTagsViaRoute>[0][number]
      >();
      if (resourceTypes.has("content")) {
        dispatch(
          contentApi.util.invalidateTags([{ type: "Content", id: "LIST" }]),
        );
        serverTags.add("content-list");
        serverTags.add("content-options");
      }
      if (resourceTypes.has("playlist")) {
        dispatch(
          playlistsApi.util.invalidateTags([{ type: "Playlist", id: "LIST" }]),
        );
        serverTags.add("playlists");
      }
      if (resourceTypes.has("schedule")) {
        dispatch(
          schedulesApi.util.invalidateTags([{ type: "Schedule", id: "LIST" }]),
        );
        serverTags.add("schedules-bootstrap");
        serverTags.add("displays-bootstrap");
        serverTags.add("displays-options");
      }
      if (serverTags.size > 0) {
        await revalidateWildfireTagsViaRoute([...serverTags]);
      }
    },
    [dispatch],
  );

  const { messages, status, error, sendMessage, addToolApprovalResponse } =
    useChat({
      transport,
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
        const toolParts = allMessages
          .filter((m) => m.role === "assistant")
          .flatMap((m) => m.parts);
        void refreshAffectedCaches(
          getAffectedResourceTypesFromParts(toolParts),
        );
      },
    });

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;

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
