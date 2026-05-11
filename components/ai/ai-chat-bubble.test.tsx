import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

import { AIChatBubble } from "@/components/ai/ai-chat-bubble";

const mocks = vi.hoisted(() => ({
  canUseAI: true,
  triggerGetCredentials: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/use-can", () => ({
  useCan: () => mocks.canUseAI,
}));

vi.mock("@/lib/api/ai-credentials-api", () => ({
  useLazyGetAICredentialsQuery: () => [
    mocks.triggerGetCredentials,
    { isFetching: false },
  ],
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockAIChat() {
      return <div>AI Chat Panel</div>;
    },
}));

describe("AIChatBubble", () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  beforeEach(() => {
    mocks.canUseAI = true;
    mocks.triggerGetCredentials.mockReset();
    mocks.toastError.mockReset();
    window.localStorage.clear();
  });

  test("does not render without AI access", () => {
    mocks.canUseAI = false;

    render(<AIChatBubble />);

    expect(
      screen.queryByRole("button", { name: "Open WILDFIRE AI" }),
    ).not.toBeInTheDocument();
  });

  test("checks credentials before opening the chat", async () => {
    mocks.triggerGetCredentials.mockReturnValue({
      unwrap: () => Promise.resolve([{ id: "credential-1" }]),
    });
    const user = userEvent.setup();

    render(<AIChatBubble />);
    await user.click(screen.getByRole("button", { name: "Open WILDFIRE AI" }));

    expect(mocks.triggerGetCredentials).toHaveBeenCalledWith(undefined, true);
    expect(
      await screen.findByRole("dialog", { name: "WILDFIRE AI" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI Chat Panel")).toBeInTheDocument();
  });

  test("shows a settings prompt when credentials are missing", async () => {
    mocks.triggerGetCredentials.mockReturnValue({
      unwrap: () => Promise.resolve([]),
    });
    const user = userEvent.setup();

    render(<AIChatBubble />);
    await user.click(screen.getByRole("button", { name: "Open WILDFIRE AI" }));

    expect(mocks.toastError).toHaveBeenCalledWith(
      "Please provide an API key in Settings first.",
      expect.objectContaining({
        description: "Go to Settings > AI Provider Credentials to configure.",
      }),
    );
    expect(
      screen.queryByRole("dialog", { name: "WILDFIRE AI" }),
    ).not.toBeInTheDocument();
  });

  test("supports y-axis keyboard movement and persists the position", async () => {
    render(<AIChatBubble />);
    const button = screen.getByRole("button", { name: "Open WILDFIRE AI" });
    const container = button.parentElement;

    fireEvent.keyDown(button, { key: "ArrowUp" });

    await waitFor(() => {
      expect(container).toHaveStyle({ bottom: "104px" });
      expect(window.localStorage.getItem("wildfire:ai-chat-bubble-y:v2")).toBe(
        "104",
      );
    });
  });

  test("defaults above page pagination controls", () => {
    render(<AIChatBubble />);
    const button = screen.getByRole("button", { name: "Open WILDFIRE AI" });

    expect(button.parentElement).toHaveStyle({ bottom: "88px" });
  });

  test("uses the versioned stored position", async () => {
    window.localStorage.setItem("wildfire:ai-chat-bubble-y", "24");
    window.localStorage.setItem("wildfire:ai-chat-bubble-y:v2", "40");

    render(<AIChatBubble />);
    const button = screen.getByRole("button", { name: "Open WILDFIRE AI" });

    await waitFor(() => {
      expect(button.parentElement).toHaveStyle({ bottom: "40px" });
      expect(window.localStorage.getItem("wildfire:ai-chat-bubble-y:v2")).toBe(
        "40",
      );
    });
  });

  test("supports y-axis pointer dragging without opening the chat", async () => {
    mocks.triggerGetCredentials.mockReturnValue({
      unwrap: () => Promise.resolve([{ id: "credential-1" }]),
    });

    render(<AIChatBubble />);
    const button = screen.getByRole("button", { name: "Open WILDFIRE AI" });
    const container = button.parentElement;

    fireEvent.pointerDown(button, { pointerId: 1, clientY: 300 });
    fireEvent.pointerMove(button, { pointerId: 1, clientY: 250 });
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 250 });

    await waitFor(() => {
      expect(container).toHaveStyle({ bottom: "138px" });
      expect(window.localStorage.getItem("wildfire:ai-chat-bubble-y:v2")).toBe(
        "138",
      );
    });
    expect(
      screen.queryByRole("dialog", { name: "WILDFIRE AI" }),
    ).not.toBeInTheDocument();
  });
});
