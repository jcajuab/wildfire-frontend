"use client";

import { isTextUIPart, isToolUIPart } from "ai";
import {
  IconLoader2,
  IconRobot,
  IconSend,
  IconUser,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIChat } from "@/hooks/use-ai-chat";
import { PendingActionCard } from "./pending-action-card";

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
  } = useAIChat({ provider, model, conversationId });

  const isLoading = status === "submitted" || status === "streaming";
  const currentProvider = PROVIDERS.find((p) => p.value === provider);

  function handleProviderChange(value: string) {
    const next = value as ProviderValue;
    setProvider(next);
    const found = PROVIDERS.find((p) => p.value === next);
    setModel(found?.models[0] ?? "");
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconRobot className="size-5" />
            Signage Assistant
          </CardTitle>
          <div className="flex gap-2">
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentProvider?.models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>
                Ask me to create content, playlists, or schedules for your
                displays.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <IconRobot className="size-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {message.parts.map((part, index) => {
                      if (isTextUIPart(part)) {
                        return (
                          <p key={index} className="whitespace-pre-wrap">
                            {part.text}
                          </p>
                        );
                      }
                      if (isToolUIPart(part)) {
                        const toolName =
                          "toolName" in part ? String(part.toolName) : "tool";
                        const toolState =
                          "state" in part ? String(part.state) : "";
                        return (
                          <div
                            key={index}
                            className="mt-2 rounded bg-background/50 p-2 text-sm"
                          >
                            <span className="font-medium">{toolName}</span>
                            {toolState === "output" && (
                              <span className="ml-2 text-green-600 dark:text-green-400">
                                Completed
                              </span>
                            )}
                            {toolState === "input" && (
                              <span className="ml-2 text-muted-foreground">
                                Running...
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {message.role === "user" && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <IconUser className="size-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconLoader2 className="size-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      {pendingActions.length > 0 && (
        <div className="border-t p-4">
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

      <CardFooter className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Create a playlist for the lobby displays..."
              disabled={isLoading}
              aria-label="Chat message input"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              <IconSend className="size-4" />
            </Button>
          </div>
          {error != null && (
            <p className="text-sm text-destructive">{error.message}</p>
          )}
        </form>
      </CardFooter>
    </Card>
  );
}
