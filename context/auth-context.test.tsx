import { type ReactElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AuthProvider, useAuth } from "@/context/auth-context";

const loginMock = vi.fn();
const logoutMock = vi.fn();
const refreshTokenMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
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
}));

function AuthProbe(): ReactElement {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? "authenticated" : "anonymous"}
      </div>
      <div data-testid="can-devices-read">
        {auth.can("devices:read") ? "yes" : "no"}
      </div>
      <button type="button" onClick={() => void auth.logout()}>
        Logout
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
    loginMock.mockReset();
    logoutMock.mockReset();
    refreshTokenMock.mockReset();
  });

  test("hydrates session and permission checks from sessionStorage", async () => {
    sessionStorage.setItem(
      "wildfire_session",
      JSON.stringify({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
        },
        expiresAt: "2099-01-01T00:00:00.000Z",
        permissions: ["devices:read"],
      }),
    );

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
    expect(screen.getByTestId("can-devices-read")).toHaveTextContent("yes");
  });

  test("clears local session on logout even if API logout fails", async () => {
    sessionStorage.setItem(
      "wildfire_session",
      JSON.stringify({
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
        },
        expiresAt: "2099-01-01T00:00:00.000Z",
        permissions: ["devices:read"],
      }),
    );
    logoutMock.mockRejectedValueOnce(new Error("network down"));

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
    expect(sessionStorage.getItem("wildfire_session")).toBeNull();
  });
});
