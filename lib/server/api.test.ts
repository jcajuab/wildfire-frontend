import { describe, expect, test, vi } from "vitest";

const { notFoundMock, redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
  notFoundMock: vi.fn((): never => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

import { handleBootstrapResult } from "@/lib/server/api";

describe("handleBootstrapResult", () => {
  test("returns when the bootstrap request succeeds", () => {
    expect(() =>
      handleBootstrapResult(
        { ok: true, data: { ok: true } },
        "/admin/displays",
      ),
    ).not.toThrow();
  });

  test("redirects to login on 401", () => {
    expect(() =>
      handleBootstrapResult({ ok: false, status: 401 }, "/admin/displays"),
    ).toThrowError("REDIRECT:/login?redirectTo=%2Fadmin%2Fdisplays");
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?redirectTo=%2Fadmin%2Fdisplays",
    );
  });

  test("redirects to unauthorized on 403", () => {
    expect(() =>
      handleBootstrapResult({ ok: false, status: 403 }, "/admin/displays"),
    ).toThrowError("REDIRECT:/unauthorized");
    expect(redirectMock).toHaveBeenCalledWith("/unauthorized");
  });

  test("calls notFound on 404", () => {
    expect(() =>
      handleBootstrapResult({ ok: false, status: 404 }, "/admin/displays"),
    ).toThrowError("NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalled();
  });

  test("throws an error for unexpected statuses", () => {
    expect(() =>
      handleBootstrapResult({ ok: false, status: 500 }, "/admin/displays"),
    ).toThrowError(
      "Server bootstrap failed for /admin/displays with status 500.",
    );
  });
});
