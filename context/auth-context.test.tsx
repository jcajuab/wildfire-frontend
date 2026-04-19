import { type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/auth-context";
import type { AuthSnapshot } from "@/types/auth";

const bootstrapAccessTokenMock = vi.fn();
const loginWithPasswordMock = vi.fn();
const logoutAuthMock = vi.fn();
const setAuthSessionMock = vi.fn();

let storeSnapshot: AuthSnapshot = {
  accessToken: null,
  accessTokenExpiresAt: null,
  user: null,
  permissions: [],
  isBootstrapped: false,
};

const listeners = new Set<(snapshot: AuthSnapshot) => void>();

vi.mock("@/lib/auth-session", () => ({
  bootstrapAccessToken: (...args: unknown[]) =>
    bootstrapAccessTokenMock(...args),
  loginWithPassword: (...args: unknown[]) => loginWithPasswordMock(...args),
  logoutAuth: (...args: unknown[]) => logoutAuthMock(...args),
  setAuthSession: (...args: unknown[]) => setAuthSessionMock(...args),
  getAuthSnapshot: () => storeSnapshot,
  subscribeToAuthState: (listener: (snapshot: AuthSnapshot) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
}));

function updateSnapshot(partial: Partial<AuthSnapshot>): void {
  storeSnapshot = { ...storeSnapshot, ...partial };
  for (const listener of listeners) {
    listener(storeSnapshot);
  }
}

function AuthProbe(): ReactElement {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? "authenticated" : "anonymous"}
      </div>
      <div data-testid="initialized">
        {auth.isInitialized ? "initialized" : "loading"}
      </div>
      <div data-testid="can-displays-read">
        {auth.can("displays:read") ? "yes" : "no"}
      </div>
      <button type="button" onClick={() => void auth.logout()}>
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    bootstrapAccessTokenMock.mockReset();
    loginWithPasswordMock.mockReset();
    logoutAuthMock.mockReset();
    setAuthSessionMock.mockReset();
    listeners.clear();
    storeSnapshot = {
      accessToken: null,
      accessTokenExpiresAt: null,
      user: null,
      permissions: [],
      isBootstrapped: false,
    };
  });

  test("shows loading until bootstrap completes", async () => {
    let resolveBootstrap: () => void;
    bootstrapAccessTokenMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveBootstrap = resolve;
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("initialized")).toHaveTextContent("loading");

    // Simulate bootstrap completing and updating the store
    resolveBootstrap!();
    updateSnapshot({
      accessToken: "test-token",
      accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      user: {
        id: "user-1",
        username: "user",
        email: "user@example.com",
        name: "User",
        isAdmin: false,
        isInvitedUser: false,
        timezone: null,
        avatarUrl: null,
      },
      permissions: ["displays:read"],
      isBootstrapped: true,
    });

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent(
        "initialized",
      );
    });
    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "authenticated",
    );
    expect(screen.getByTestId("can-displays-read")).toHaveTextContent("yes");
  });

  test("hydrates session and permission checks from store", async () => {
    bootstrapAccessTokenMock.mockImplementation(async () => {
      updateSnapshot({
        accessToken: "test-token",
        accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
        user: {
          id: "user-1",
          username: "user",
          email: "user@example.com",
          name: "User",
          isAdmin: false,
          isInvitedUser: false,
          timezone: null,
          avatarUrl: null,
        },
        permissions: ["displays:read"],
        isBootstrapped: true,
      });
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated",
      );
    });
    expect(screen.getByTestId("can-displays-read")).toHaveTextContent("yes");
  });

  test("remains anonymous when bootstrap fails with 401", async () => {
    bootstrapAccessTokenMock.mockImplementation(async () => {
      updateSnapshot({ isBootstrapped: true });
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("initialized")).toHaveTextContent(
        "initialized",
      );
    });
    expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
  });

  test("clears client state on logout", async () => {
    bootstrapAccessTokenMock.mockImplementation(async () => {
      updateSnapshot({
        accessToken: "test-token",
        accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
        user: {
          id: "user-1",
          username: "user",
          email: "user@example.com",
          name: "User",
          isAdmin: false,
          isInvitedUser: false,
          timezone: null,
          avatarUrl: null,
        },
        permissions: ["displays:read"],
        isBootstrapped: true,
      });
    });

    logoutAuthMock.mockImplementation(async () => {
      updateSnapshot({
        accessToken: null,
        accessTokenExpiresAt: null,
        user: null,
        permissions: [],
      });
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated",
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
    });
  });
});
