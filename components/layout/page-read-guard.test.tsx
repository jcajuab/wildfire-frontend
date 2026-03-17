import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { PageReadGuard } from "@/components/layout/page-read-guard";
import { useAuth } from "@/context/auth-context";
import type { PermissionType } from "@/types/permission";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");

  return {
    ...actual,
    usePathname: vi.fn(),
  };
});

vi.mock("@/context/auth-context", () => ({
  useAuth: vi.fn(),
}));

const usePathnameMock = vi.mocked(usePathname);
const useAuthMock = vi.mocked(useAuth);

function renderGuard(): ReactElement {
  return (
    <PageReadGuard>
      <div>Allowed content</div>
    </PageReadGuard>
  );
}

function allowOnly(
  ...allowed: readonly PermissionType[]
): ReturnType<typeof useAuth>["can"] {
  return (permission) => allowed.includes(permission);
}

describe("PageReadGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    usePathnameMock.mockReturnValue("/admin/playlists/create");
  });

  test("shows the access-denied state for read-only playlist users", () => {
    useAuthMock.mockReturnValue({
      can: allowOnly("playlists:read"),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(renderGuard());

    expect(
      screen.getByText("You don't have access to this page"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Allowed content")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to dashboard" }),
    ).toHaveAttribute("href", "/admin/playlists");
  });

  test("renders children for users with playlist create permission", () => {
    useAuthMock.mockReturnValue({
      can: allowOnly("playlists:create", "playlists:read"),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(renderGuard());

    expect(screen.getByText("Allowed content")).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have access to this page"),
    ).not.toBeInTheDocument();
  });

  test("shows access denied for read-only role users on create", () => {
    usePathnameMock.mockReturnValue("/admin/roles/create");
    useAuthMock.mockReturnValue({
      can: allowOnly("roles:read"),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(renderGuard());

    expect(
      screen.getByText("You don't have access to this page"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Allowed content")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to dashboard" }),
    ).toHaveAttribute("href", "/admin/roles");
  });

  test("shows access denied for read-only role users on edit", () => {
    usePathnameMock.mockReturnValue("/admin/roles/edit/role-123");
    useAuthMock.mockReturnValue({
      can: allowOnly("roles:read"),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(renderGuard());

    expect(
      screen.getByText("You don't have access to this page"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Allowed content")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Go to dashboard" }),
    ).toHaveAttribute("href", "/admin/roles");
  });

  test("renders children for users with role update permission on edit", () => {
    usePathnameMock.mockReturnValue("/admin/roles/edit/role-123");
    useAuthMock.mockReturnValue({
      can: allowOnly("roles:update", "roles:read"),
      isInitialized: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(renderGuard());

    expect(screen.getByText("Allowed content")).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have access to this page"),
    ).not.toBeInTheDocument();
  });
});
