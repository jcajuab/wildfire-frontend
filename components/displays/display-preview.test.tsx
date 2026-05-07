import { act, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DisplayPreview } from "@/components/displays/display-preview";
import { authFetch } from "@/lib/auth-session";

vi.mock("next/image", () => ({
  default: ({ alt }: ComponentProps<"img">) => (
    <div aria-label={typeof alt === "string" ? alt : undefined} />
  ),
}));

vi.mock("@/lib/auth-session", () => ({
  authFetch: vi.fn(),
}));

const authFetchMock = vi.mocked(authFetch);

type IntersectionObserverCallback = ConstructorParameters<
  typeof IntersectionObserver
>[0];

let intersectionCallback: IntersectionObserverCallback | null = null;

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);
}

function intersect(isIntersecting: boolean): void {
  const callback = intersectionCallback;
  if (callback == null) {
    throw new Error("IntersectionObserver was not created.");
  }

  act(() => {
    callback(
      [
        {
          isIntersecting,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );
  });
}

describe("DisplayPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersectionCallback = null;
    globalThis.IntersectionObserver =
      IntersectionObserverMock as unknown as typeof IntersectionObserver;
    globalThis.URL.createObjectURL = vi.fn(() => "blob:preview");
    globalThis.URL.revokeObjectURL = vi.fn();
    authFetchMock.mockResolvedValue(
      new Response(new Blob(["image"], { type: "image/png" }), {
        status: 200,
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("does not fetch a live preview before it is visible", () => {
    render(
      <DisplayPreview
        displayId="display-1"
        displayName="Lobby Display"
        displayStatus="READY"
      />,
    );

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  test("fetches a live preview after the preview area becomes visible", async () => {
    render(
      <DisplayPreview
        displayId="display-1"
        displayName="Lobby Display"
        displayStatus="READY"
      />,
    );

    intersect(true);

    await waitFor(() => {
      expect(authFetchMock).toHaveBeenCalledTimes(1);
    });
    expect(authFetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/displays/display-1/preview"),
      expect.objectContaining({
        cache: "no-store",
        method: "GET",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test("does not fetch previews for down displays", () => {
    render(
      <DisplayPreview
        displayId="display-1"
        displayName="Lobby Display"
        displayStatus="DOWN"
      />,
    );

    expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  test("aborts an in-flight preview fetch when unmounted", async () => {
    let capturedSignal: AbortSignal | null = null;
    authFetchMock.mockImplementation((_url, init) => {
      capturedSignal =
        init != null && "signal" in init ? (init.signal as AbortSignal) : null;
      return new Promise<Response>(() => {});
    });

    const { unmount } = render(
      <DisplayPreview
        displayId="display-1"
        displayName="Lobby Display"
        displayStatus="READY"
      />,
    );

    intersect(true);
    await waitFor(() => {
      expect(capturedSignal).not.toBeNull();
    });

    unmount();

    expect(capturedSignal).not.toBeNull();
    expect(capturedSignal!.aborted).toBe(true);
  });
});
