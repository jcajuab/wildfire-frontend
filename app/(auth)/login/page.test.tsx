import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AuthResponse } from "@/types/auth";

const loginMock = vi.fn();
const refreshAccessTokenMock = vi.fn();
const purgeStaleSessionMock = vi.fn();

let searchParams = new URLSearchParams();
let isAuthenticated = false;
let isInitialized = true;
let canMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    login: loginMock,
    isAuthenticated,
    isInitialized,
    can: canMock,
  }),
}));

vi.mock("@/lib/auth-session", () => ({
  refreshAccessToken: (...args: unknown[]) => refreshAccessTokenMock(...args),
  purgeStaleSession: (...args: unknown[]) => purgeStaleSessionMock(...args),
}));

function makeAuthResponse(): AuthResponse {
  return {
    type: "bearer",
    accessToken: "login-token",
    accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    user: {
      id: "user-1",
      username: "admin",
      email: null,
      name: "Admin",
      isAdmin: true,
      isInvitedUser: false,
      timezone: null,
      avatarUrl: null,
    },
    permissions: [],
  };
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.resetModules();
    loginMock.mockReset();
    refreshAccessTokenMock.mockReset();
    purgeStaleSessionMock.mockReset();
    canMock = vi.fn(() => true);
    searchParams = new URLSearchParams();
    isAuthenticated = false;
    isInitialized = true;
  });

  test("manual login with redirect uses the login response and skips refresh", async () => {
    const navigate = vi.fn();
    searchParams = new URLSearchParams([["redirectTo", "/admin/users"]]);
    loginMock.mockResolvedValue(makeAuthResponse());
    const { setPostLoginNavigatorForTest } = await import("./login-content");
    const { default: LoginPage } = await import("./page");
    setPostLoginNavigatorForTest(navigate);

    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText("Username"), "admin");
    await userEvent.type(screen.getByLabelText("Password"), "Admin12345!");
    await userEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        username: "admin",
        password: "Admin12345!",
      });
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/admin/users");
    setPostLoginNavigatorForTest(null);
  });

  test("already-authenticated login redirect navigates without refresh", async () => {
    const navigate = vi.fn();
    searchParams = new URLSearchParams([["redirectTo", "/admin/content"]]);
    isAuthenticated = true;
    refreshAccessTokenMock.mockResolvedValue(makeAuthResponse());
    const { setPostLoginNavigatorForTest } = await import("./login-content");
    const { default: LoginPage } = await import("./page");
    setPostLoginNavigatorForTest(navigate);

    render(<LoginPage />);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/admin/content");
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    setPostLoginNavigatorForTest(null);
  });

  test("already-authenticated login redirect leaves stale-session cleanup to bootstrap", async () => {
    const navigate = vi.fn();
    searchParams = new URLSearchParams([["redirectTo", "/admin/users"]]);
    isAuthenticated = true;
    const { setPostLoginNavigatorForTest } = await import("./login-content");
    const { default: LoginPage } = await import("./page");
    setPostLoginNavigatorForTest(navigate);

    render(<LoginPage />);

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/admin/users");
    });
    expect(refreshAccessTokenMock).not.toHaveBeenCalled();
    expect(purgeStaleSessionMock).not.toHaveBeenCalled();
    setPostLoginNavigatorForTest(null);
  });
});
