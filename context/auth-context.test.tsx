import { type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/auth-context";

const loginMock = vi.fn();
const logoutMock = vi.fn();
const refreshTokenMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/lib/api/auth-api", () => ({
  AuthApiError: class AuthApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = "AuthApiError";
    }
  },
  login: (...args: unknown[]) => loginMock(...args),
  logoutApi: (...args: unknown[]) => logoutMock(...args),
  refreshToken: (...args: unknown[]) => refreshTokenMock(...args),
  getSession: (...args: unknown[]) => getSessionMock(...args),
  getCsrfToken: () => null,
}));

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
    loginMock.mockReset();
    logoutMock.mockReset();
    refreshTokenMock.mockReset();
    getSessionMock.mockReset();
  });

  test("shows loading until hydration completes", async () => {
    let resolveSession: (v: unknown) => void;
    getSessionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("initialized")).toHaveTextContent("loading");

    resolveSession!({
      type: "bearer",
      expiresAt: "2099-01-01T00:00:00.000Z",
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

  test("hydrates session and permission checks from server", async () => {
    getSessionMock.mockResolvedValueOnce({
      type: "bearer",
      expiresAt: "2099-01-01T00:00:00.000Z",
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

  test("remains anonymous when session returns 401", async () => {
    getSessionMock.mockRejectedValueOnce(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
    );

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

  test("clears client state on logout even if API logout fails", async () => {
    getSessionMock.mockResolvedValueOnce({
      type: "bearer",
      expiresAt: "2099-01-01T00:00:00.000Z",
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
    });
    logoutMock.mockResolvedValueOnce(undefined); // logoutApi never throws

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
