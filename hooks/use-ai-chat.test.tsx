import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { useAIChat } from "@/hooks/use-ai-chat";

const transportConfigs: Array<{ api?: string }> = [];

vi.mock("ai", () => ({
  DefaultChatTransport: vi.fn(
    class DefaultChatTransportMock {
      constructor(config: { api?: string }) {
        transportConfigs.push(config);
      }
    },
  ),
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(() => ({
    messages: [],
    status: "ready",
    error: null,
    sendMessage: vi.fn(),
    addToolApprovalResponse: vi.fn(),
  })),
}));

vi.mock("@/lib/hooks", () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  getAuthorizationHeaders: vi.fn(() => ({ Authorization: "Bearer token" })),
}));

vi.mock("@/lib/api/revalidate-via-route", () => ({
  revalidateWildfireTagsViaRoute: vi.fn(),
}));

describe("useAIChat", () => {
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalApiVersion = process.env.NEXT_PUBLIC_API_VERSION;

  afterEach(() => {
    transportConfigs.length = 0;
    if (originalApiUrl == null) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalApiVersion == null) {
      delete process.env.NEXT_PUBLIC_API_VERSION;
    } else {
      process.env.NEXT_PUBLIC_API_VERSION = originalApiVersion;
    }
  });

  test("uses the versioned production backend AI chat endpoint", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://wildfire.dcism.org/api";
    process.env.NEXT_PUBLIC_API_VERSION = "v1";

    renderHook(() =>
      useAIChat({
        provider: "openai",
        model: "gpt-4o-mini",
        conversationId: "conversation-1",
      }),
    );

    expect(transportConfigs[0]?.api).toBe(
      "https://wildfire.dcism.org/api/v1/ai/chat",
    );
  });

  test("uses the versioned relative API endpoint", () => {
    process.env.NEXT_PUBLIC_API_URL = "/api";
    process.env.NEXT_PUBLIC_API_VERSION = "v1";

    renderHook(() =>
      useAIChat({
        provider: "openai",
        model: "gpt-4o-mini",
        conversationId: "conversation-1",
      }),
    );

    expect(transportConfigs[0]?.api).toBe("/api/v1/ai/chat");
    expect(transportConfigs[0]?.api).not.toBe("/api/ai/chat");
  });
});
