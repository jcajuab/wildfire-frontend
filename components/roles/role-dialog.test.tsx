import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { RoleDialog } from "@/components/roles/role-dialog";
import { useGetUserOptionsQuery } from "@/lib/api/rbac-api";

vi.mock("@/lib/api/rbac-api", () => ({
  useGetUserOptionsQuery: vi.fn(),
}));

const useGetUserOptionsQueryMock = vi.mocked(useGetUserOptionsQuery);

describe("RoleDialog", () => {
  beforeEach(() => {
    useGetUserOptionsQueryMock.mockReset();
    useGetUserOptionsQueryMock.mockReturnValue({
      data: [],
    } as unknown as ReturnType<typeof useGetUserOptionsQuery>);
  });

  test("skips user options loading when the viewer cannot read users", async () => {
    const user = userEvent.setup();

    render(
      <RoleDialog
        mode="create"
        open={true}
        onOpenChange={vi.fn()}
        permissions={[]}
        canReadUsers={false}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Manage Users/i }));

    expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
      { q: undefined },
      expect.objectContaining({
        refetchOnMountOrArgChange: true,
        skip: true,
      }),
    );
    expect(
      screen.getByText(/User assignment is unavailable without/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search users by name, username, or email"),
    ).not.toBeInTheDocument();
  });

  test("loads user options when the viewer can read users", async () => {
    const user = userEvent.setup();

    render(
      <RoleDialog
        mode="create"
        open={true}
        onOpenChange={vi.fn()}
        permissions={[]}
        canReadUsers={true}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Manage Users/i }));

    expect(useGetUserOptionsQueryMock).toHaveBeenCalledWith(
      { q: undefined },
      expect.objectContaining({
        refetchOnMountOrArgChange: true,
        skip: false,
      }),
    );
    expect(
      screen.getByPlaceholderText("Search users by name, username, or email"),
    ).toBeInTheDocument();
  });
});
