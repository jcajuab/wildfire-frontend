import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  TermsAndConditionsProvider,
  useTermsAndConditions,
} from "@/components/legal/terms-and-conditions-provider";
import { useAuth } from "@/context/auth-context";
import {
  getTermsAcceptanceStorageKey,
  TERMS_AND_CONDITIONS_VERSION,
} from "@/lib/terms-and-conditions";

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

function mockAuth(userId = "user-1") {
  useAuthMock.mockReturnValue({
    user: {
      id: userId,
      username: "viewer",
      email: "viewer@wildfire.dcism.org",
      name: "Viewer Test",
      isAdmin: false,
      isInvitedUser: true,
      timezone: "Asia/Manila",
      avatarUrl: null,
    },
    permissions: [],
    isAuthenticated: true,
    isLoading: false,
    isInitialized: true,
    can: () => false,
    login: vi.fn(),
    logout: vi.fn(),
    bootstrapSession: vi.fn(),
    updateSession: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
}

function ManualTermsButton() {
  const { openTermsAndConditions } = useTermsAndConditions();
  return (
    <button type="button" onClick={openTermsAndConditions}>
      Open terms
    </button>
  );
}

function renderProvider() {
  render(
    <TermsAndConditionsProvider>
      <ManualTermsButton />
    </TermsAndConditionsProvider>,
  );
}

async function scrollTermsToEnd() {
  const scrollArea = await screen.findByTestId("terms-scroll-area");
  Object.defineProperties(scrollArea, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 240 },
    scrollTop: { configurable: true, value: 140 },
  });
  fireEvent.scroll(scrollArea);
}

describe("TermsAndConditionsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockAuth();
  });

  test("requires unread authenticated users to accept the current terms", async () => {
    const user = userEvent.setup();

    renderProvider();

    const dialog = await screen.findByRole("dialog", {
      name: "Terms and Conditions",
    });
    expect(dialog).toBeInTheDocument();

    const acceptButton = screen.getByRole("button", {
      name: "Accept and Continue",
    });
    expect(acceptButton).toBeDisabled();

    await scrollTermsToEnd();
    expect(acceptButton).toBeEnabled();

    await user.click(acceptButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Terms and Conditions" }),
      ).not.toBeInTheDocument();
    });
    expect(
      JSON.parse(
        window.localStorage.getItem(getTermsAcceptanceStorageKey("user-1")) ??
          "{}",
      ),
    ).toMatchObject({ version: TERMS_AND_CONDITIONS_VERSION });
  });

  test("does not auto-open when the same user accepted the current version", () => {
    window.localStorage.setItem(
      getTermsAcceptanceStorageKey("user-1"),
      JSON.stringify({
        acceptedAt: "2026-05-20T00:00:00.000Z",
        version: TERMS_AND_CONDITIONS_VERSION,
      }),
    );

    renderProvider();

    expect(
      screen.queryByRole("dialog", { name: "Terms and Conditions" }),
    ).not.toBeInTheDocument();
  });

  test("uses a separate acceptance key for each user on the same browser", async () => {
    window.localStorage.setItem(
      getTermsAcceptanceStorageKey("user-1"),
      JSON.stringify({
        acceptedAt: "2026-05-20T00:00:00.000Z",
        version: TERMS_AND_CONDITIONS_VERSION,
      }),
    );
    mockAuth("user-2");

    renderProvider();

    expect(
      await screen.findByRole("dialog", { name: "Terms and Conditions" }),
    ).toBeInTheDocument();
  });

  test("allows accepted users to reopen the terms manually", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      getTermsAcceptanceStorageKey("user-1"),
      JSON.stringify({
        acceptedAt: "2026-05-20T00:00:00.000Z",
        version: TERMS_AND_CONDITIONS_VERSION,
      }),
    );

    renderProvider();
    await user.click(screen.getByRole("button", { name: "Open terms" }));

    expect(
      await screen.findByRole("dialog", { name: "Terms and Conditions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
  });
});
