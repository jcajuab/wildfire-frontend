import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ReactElement } from "react";
import type { ServerSession, ServerSessionResult } from "@/lib/server/auth";

const { getServerSessionMock, redirectMock, serverFetchJsonMock } = vi.hoisted(
  () => ({
    getServerSessionMock: vi.fn(),
    redirectMock: vi.fn((target: string): never => {
      throw new Error(`REDIRECT:${target}`);
    }),
    serverFetchJsonMock: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/server/auth", () => ({
  getServerSession: getServerSessionMock,
  getCachedServerSession: getServerSessionMock,
  resolveOptionalDashboardSession: (
    result: ServerSessionResult,
  ): ServerSession | null => (result.status === "ok" ? result.session : null),
}));

vi.mock("@/lib/server/api", () => ({
  WILDFIRE_SERVER_REVALIDATE_SECONDS: 60,
  handleBootstrapResult: vi.fn((result: { ok: boolean; status?: number }) => {
    if (!result.ok) {
      throw new Error(`BOOTSTRAP:${result.status}`);
    }
  }),
  serverFetchJson: serverFetchJsonMock,
  sessionHasPermission: (session: ServerSession, permission: string): boolean =>
    session.user.isAdmin ||
    session.permissions.includes(
      permission as ServerSession["permissions"][number],
    ),
}));

vi.mock("@/lib/api/contracts", () => ({
  parseApiResponseDataSafe: vi.fn((payload: { data: unknown }) => payload.data),
}));

vi.mock("./settings-page-client", () => ({
  AICredentialsCacheSeeder: ({
    data,
  }: {
    readonly data: readonly unknown[];
  }): ReactElement => (
    <div data-count={data.length} data-testid="ai-credentials-seeder" />
  ),
  SettingsPageView: ({
    canManageAICredentials,
  }: {
    readonly canManageAICredentials: boolean;
  }): ReactElement => (
    <main>
      <h1>Settings</h1>
      {canManageAICredentials ? (
        <section>AI Provider Credentials</section>
      ) : null}
    </main>
  ),
}));

import SettingsPage from "./page";

const makeSession = (
  permissions: ServerSession["permissions"],
): ServerSession => ({
  accessToken: "access-token",
  accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
  user: {
    id: "user-1",
    username: "alice",
    email: null,
    name: "Alice",
    isAdmin: false,
    isInvitedUser: false,
    timezone: null,
    avatarUrl: null,
  },
  permissions,
});

const makeSessionResult = (
  permissions: ServerSession["permissions"],
): ServerSessionResult => ({
  status: "ok",
  session: makeSession(permissions),
});

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders settings without fetching AI credentials when ai access is missing", async () => {
    getServerSessionMock.mockResolvedValue(
      makeSessionResult(["displays:read"]),
    );

    render(await SettingsPage());

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(
      screen.queryByText("AI Provider Credentials"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ai-credentials-seeder"),
    ).not.toBeInTheDocument();
    expect(serverFetchJsonMock).not.toHaveBeenCalled();
  });

  test("bootstraps AI credentials when ai access is present", async () => {
    getServerSessionMock.mockResolvedValue(makeSessionResult(["ai:access"]));
    serverFetchJsonMock.mockResolvedValue({
      ok: true,
      data: { data: [{ id: "credential-1" }] },
    });

    render(await SettingsPage());

    expect(screen.getByText("AI Provider Credentials")).toBeVisible();
    expect(screen.getByTestId("ai-credentials-seeder")).toHaveAttribute(
      "data-count",
      "1",
    );
    expect(serverFetchJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: "ai/credentials" }),
    );
  });

  test("renders guarded fallback when server session is unauthenticated", async () => {
    getServerSessionMock.mockResolvedValue({ status: "unauthenticated" });

    render(await SettingsPage());

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(serverFetchJsonMock).not.toHaveBeenCalled();
  });
});
