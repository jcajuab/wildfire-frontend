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
  const [isComposing, setIsComposing] = useState(false);

  // Derive effective provider: use selected if available, otherwise first configured
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
      setInput((prev) => {
        const replaced = prev.replace(/\/\S*$/, `/${cmd.id} `);
        return replaced;
      });
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
            <ConversationEmptyState
              icon={<WildfireLogo className="h-8 w-auto" />}
              title=""
              description="Ask me to create content, playlists, or schedules. Type / to see available commands."
            />
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
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div
                className="grid w-full grid-cols-1 min-h-16 max-h-48 overflow-y-auto"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("button")) {
                    (
                      e.currentTarget.querySelector(
                        "textarea",
                      ) as HTMLTextAreaElement | null
                    )?.focus();
                  }
                }}
              >
                {/* Mirror div for highlighting — grid-stacked behind textarea.
                    Both occupy the same grid cell so the mirror tracks height exactly. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 w-full whitespace-pre-wrap break-words px-3 py-2 text-sm"
                  style={{ wordBreak: "break-word" }}
                >
                  {input
                    ? input.split(/(\s+)/).map((segment, idx) => {
                        const isCommand =
                          /^\/[\w-]+$/.test(segment) &&
                          KNOWN_COMMAND_IDS.has(segment.slice(1));
                        return isCommand ? (
                          <span
                            key={idx}
                            className="rounded bg-primary/15 px-0.5 text-transparent"
                          >
                            {segment}
                          </span>
                        ) : (
                          <span key={idx} className="text-transparent">
                            {segment}
                          </span>
                        );
                      })
                    : /* empty placeholder to maintain min-height */ "\u00A0"}
                </div>
                <textarea
                  data-slot="input-group-control"
                  name="message"
                  rows={1}
                  disabled={!hasCredentials}
                  className="col-start-1 row-start-1 w-full min-w-0 resize-none border-0 bg-transparent px-3 py-2 text-sm caret-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ wordBreak: "break-word" }}
                  value={input}
                  onChange={(e) => handleInputChange(e.currentTarget.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === "Tab") &&
                      showSlashMenu
                    ) {
                      e.preventDefault();
                      return;
                    }
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !isComposing &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      const form = e.currentTarget.form;
                      const submitBtn = form?.querySelector(
                        'button[type="submit"]',
                      ) as HTMLButtonElement | null;
                      if (!submitBtn?.disabled) {
                        form?.requestSubmit();
                      }
                    }
                  }}
                  placeholder={
                    !hasCredentials
                      ? "Configure an API key in Settings to start..."
                      : "Type a message or / for commands..."
                  }
                />
              </div>
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
