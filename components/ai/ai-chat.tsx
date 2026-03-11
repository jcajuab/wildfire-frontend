"use client";

import { isTextUIPart, isToolUIPart } from "ai";
import { Fragment, useCallback, useState } from "react";
import { WildfireLogo } from "@/components/common/wildfire-logo";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useAIChat } from "@/hooks/use-ai-chat";
import type { SlashCommand } from "@/lib/slash-commands";
import { PendingActionCard } from "./pending-action-card";
import { SlashCommandMenu } from "./slash-command-menu";
import { ToolChip } from "./tool-chip";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini"] },
  {
    value: "anthropic",
    label: "Anthropic",
    models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"],
  },
  {
    value: "google",
    label: "Google",
    models: ["gemini-2.0-flash", "gemini-1.5-pro"],
  },
] as const;

type ProviderValue = (typeof PROVIDERS)[number]["value"];

export function AIChat() {
  const [provider, setProvider] = useState<ProviderValue>("openai");
  const [model, setModel] = useState("gpt-4o");
  const [conversationId] = useState(() => crypto.randomUUID());
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const {
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
  } = useAIChat({ provider, model, conversationId });

  const currentProvider = PROVIDERS.find((p) => p.value === provider);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      const slashMatch = value.match(/\/(\S*)$/);
      if (slashMatch) {
        setShowSlashMenu(true);
        setSlashQuery(slashMatch[1] ?? "");
      } else {
        setShowSlashMenu(false);
        setSlashQuery("");
      }
    },
    [setInput],
  );

  const handleCommandSelect = useCallback(
    (cmd: SlashCommand) => {
      addTool(cmd);
      setInput((prev) => prev.replace(/\/\S*$/, "").trim());
      setShowSlashMenu(false);
      setSlashQuery("");
    },
    [addTool, setInput],
  );

  const handleProviderChange = (value: string) => {
    const next = value as ProviderValue;
    setProvider(next);
    const found = PROVIDERS.find((p) => p.value === next);
    setModel(found?.models[0] ?? "");
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<WildfireLogo className="h-8 w-auto" />}
              title=""
              description="Ask me to create content, playlists, or schedules. Type / to see available commands."
            />
          ) : (
            messages.map((message) => (
              <Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  if (isTextUIPart(part)) {
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  }
                  if (isToolUIPart(part)) {
                    if (part.type === "dynamic-tool") {
                      return (
                        <Tool key={`${message.id}-${i}`}>
                          <ToolHeader
                            type="dynamic-tool"
                            state={part.state}
                            toolName={part.toolName}
                          />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            {"output" in part && part.output !== undefined && (
                              <ToolOutput
                                output={part.output}
                                errorText={part.errorText}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  }
                  return null;
                })}
              </Fragment>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {pendingActions.length > 0 && (
        <div className="border-t p-3">
          <p className="mb-2 text-sm font-medium">Pending Actions</p>
          <div className="space-y-2">
            {pendingActions.map((action) => (
              <PendingActionCard
                key={action.token}
                action={action}
                onConfirm={() => void confirmAction(action.token, true)}
                onReject={() => void confirmAction(action.token, false)}
                onCancel={() => void cancelAction(action.token)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative border-t p-3">
        {selectedTools.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {selectedTools.map((cmd) => (
              <ToolChip
                key={cmd.id}
                command={cmd}
                onRemove={() => removeTool(cmd.id)}
              />
            ))}
          </div>
        )}

        <SlashCommandMenu
          query={slashQuery}
          onSelect={handleCommandSelect}
          onClose={() => setShowSlashMenu(false)}
          visible={showSlashMenu}
        />

        <PromptInput
          onSubmit={(message) => {
            setInput(message.text);
            handleSubmit();
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => handleInputChange(e.currentTarget.value)}
              placeholder="Type a message or / for commands..."
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputSelect
                value={provider}
                onValueChange={handleProviderChange}
              >
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {PROVIDERS.map((p) => (
                    <PromptInputSelectItem key={p.value} value={p.value}>
                      {p.label}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
              <PromptInputSelect value={model} onValueChange={setModel}>
                <PromptInputSelectTrigger>
                  <PromptInputSelectValue />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {currentProvider?.models.map((m) => (
                    <PromptInputSelectItem key={m} value={m}>
                      {m}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            </PromptInputTools>
            <PromptInputSubmit status={status} />
          </PromptInputFooter>
        </PromptInput>

        {error != null && (
          <p className="mt-1 text-sm text-destructive">{error.message}</p>
        )}
      </div>
    </div>
  );
}
