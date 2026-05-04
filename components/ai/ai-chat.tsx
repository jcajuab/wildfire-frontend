"use client";

import { isTextUIPart, isToolUIPart } from "ai";
import { Fragment, useCallback, useMemo, useState } from "react";
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
  Confirmation,
  ConfirmationAccepted,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useAICredentials } from "@/hooks/use-ai-credentials";
import { SLASH_COMMANDS, type SlashCommand } from "@/lib/slash-commands";
import { SlashCommandMenu } from "./slash-command-menu";

const KNOWN_COMMAND_IDS = new Set(SLASH_COMMANDS.map((c) => c.id));

function formatErrorMessage(message: string): string {
  if (typeof message !== "string") return "Something went wrong.";
  if (message.startsWith("{")) {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      const msg =
        typeof parsed.message === "string"
          ? parsed.message
          : typeof parsed.error === "string"
            ? parsed.error
            : null;
      if (msg) return msg;
    } catch {
      // fall through to raw message
    }
  }
  return message || "Something went wrong.";
}

function parseMessageTokens(
  text: string,
): Array<{ type: "command" | "text"; value: string }> {
  const tokens: Array<{ type: "command" | "text"; value: string }> = [];
  const parts = text.split(/(\/[\w-]+)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("/") && KNOWN_COMMAND_IDS.has(part.slice(1))) {
      tokens.push({ type: "command", value: part });
    } else {
      tokens.push({ type: "text", value: part });
    }
  }
  return tokens;
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", model: "gpt-4o-mini" },
  {
    value: "anthropic",
    label: "Anthropic",
    model: "claude-3-5-haiku-20241022",
  },
  { value: "google", label: "Google", model: "gemini-2.5-flash" },
] as const;

type ProviderValue = (typeof PROVIDERS)[number]["value"];

export function AIChat() {
  const { credentials } = useAICredentials();

  const configuredProviders = useMemo(
    () =>
      PROVIDERS.filter((p) => credentials.some((c) => c.provider === p.value)),
    [credentials],
  );

  const hasCredentials = configuredProviders.length > 0;

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderValue>("openai");
  const [conversationId] = useState(() => crypto.randomUUID());
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");

  const provider = configuredProviders.some((p) => p.value === selectedProvider)
    ? selectedProvider
    : (configuredProviders[0]?.value ?? selectedProvider);

  const currentProvider = configuredProviders.find((p) => p.value === provider);
  const model = currentProvider?.model ?? PROVIDERS[0].model;

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    error,
    addToolApprovalResponse,
  } = useAIChat({ provider, model, conversationId });

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
      setInput((prev) => prev.replace(/\/\S*$/, `/${cmd.id} `));
      setShowSlashMenu(false);
      setSlashQuery("");
    },
    [setInput],
  );

  const handleProviderChange = useCallback((value: string) => {
    setSelectedProvider(value as ProviderValue);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <div className="text-muted-foreground">
                <WildfireLogo className="h-8 w-auto" />
              </div>
              <p className="text-muted-foreground text-sm">
                Ask me to create content, playlists, or schedules. Type / to see
                available commands.
              </p>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => {
              const parts = message.parts.map((part, i) => {
                if (isTextUIPart(part)) {
                  if (message.role === "user") {
                    const tokens = parseMessageTokens(part.text);
                    const hasCommands = tokens.some(
                      (t) => t.type === "command",
                    );
                    if (hasCommands) {
                      return (
                        <Message key={`${message.id}-${i}`} from="user">
                          <MessageContent>
                            <p className="text-sm leading-relaxed">
                              {tokens.map((token, j) =>
                                token.type === "command" ? (
                                  <span
                                    key={j}
                                    className="rounded bg-primary/15 px-1 py-0.5 font-medium text-primary"
                                  >
                                    {token.value}
                                  </span>
                                ) : (
                                  <span key={j}>{token.value}</span>
                                ),
                              )}
                            </p>
                          </MessageContent>
                        </Message>
                      );
                    }
                  }
                  return (
                    <Message key={`${message.id}-${i}`} from={message.role}>
                      <MessageContent>
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                }
                if (isToolUIPart(part)) {
                  const toolName =
                    "toolName" in part ? part.toolName : undefined;
                  const isDestructive =
                    typeof toolName === "string" &&
                    (/delete/i.test(toolName) || /edit/i.test(toolName));
                  const header =
                    part.type === "dynamic-tool" ? (
                      <ToolHeader
                        type={part.type}
                        state={part.state}
                        toolName={part.toolName}
                      />
                    ) : (
                      <ToolHeader type={part.type} state={part.state} />
                    );
                  return (
                    <Tool key={`${message.id}-${i}`}>
                      {header}
                      <ToolContent>
                        <ToolInput input={part.input} />
                        {"output" in part && part.output !== undefined && (
                          <ToolOutput
                            output={part.output}
                            errorText={part.errorText}
                          />
                        )}
                      </ToolContent>
                      <Confirmation approval={part.approval} state={part.state}>
                        <ConfirmationTitle>
                          This action requires your approval.
                        </ConfirmationTitle>
                        <ConfirmationRequest>
                          <ConfirmationActions>
                            <ConfirmationAction
                              variant="outline"
                              onClick={() =>
                                void addToolApprovalResponse({
                                  id: part.approval!.id,
                                  approved: false,
                                  reason: "User rejected",
                                })
                              }
                            >
                              Reject
                            </ConfirmationAction>
                            <ConfirmationAction
                              variant={
                                isDestructive ? "destructive" : "default"
                              }
                              onClick={() =>
                                void addToolApprovalResponse({
                                  id: part.approval!.id,
                                  approved: true,
                                })
                              }
                            >
                              Approve
                            </ConfirmationAction>
                          </ConfirmationActions>
                        </ConfirmationRequest>
                        <ConfirmationAccepted>
                          <p className="text-sm text-muted-foreground">
                            Approved
                          </p>
                        </ConfirmationAccepted>
                        <ConfirmationRejected>
                          <p className="text-sm text-muted-foreground">
                            Rejected
                          </p>
                        </ConfirmationRejected>
                      </Confirmation>
                    </Tool>
                  );
                }
                return null;
              });

              return (
                <Fragment key={message.id}>
                  {message.role === "assistant" ? <>{parts}</> : parts}
                </Fragment>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <div className="relative">
          <SlashCommandMenu
            query={slashQuery}
            onSelect={handleCommandSelect}
            onClose={() => setShowSlashMenu(false)}
            visible={showSlashMenu}
          />

          <PromptInput
            onSubmit={() => {
              handleSubmit();
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                disabled={!hasCredentials}
                value={input}
                onChange={(e) => handleInputChange(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === "Tab") && showSlashMenu) {
                    e.preventDefault();
                  }
                }}
                placeholder={
                  !hasCredentials
                    ? "Configure an API key in Settings to start..."
                    : "Type a message or / for commands..."
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                {hasCredentials && (
                  <PromptInputSelect
                    value={provider}
                    onValueChange={handleProviderChange}
                  >
                    <PromptInputSelectTrigger>
                      <PromptInputSelectValue />
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {configuredProviders.map((p) => (
                        <PromptInputSelectItem key={p.value} value={p.value}>
                          {p.label}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                )}
              </PromptInputTools>
              <PromptInputSubmit status={status} disabled={!hasCredentials} />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {error != null && (
          <p className="mt-1 text-sm text-destructive">
            {formatErrorMessage(error.message)} Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
