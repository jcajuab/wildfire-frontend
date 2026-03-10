import { emitAuthRefreshRequested } from "@/lib/auth-events";

/**
 * RTK Query onQueryStarted callback that refreshes auth state after successful mutations.
 *
 * This helper is used with mutations that might change user permissions or roles,
 * triggering a refresh of the current user's authentication state.
 *
 * @param _arg - Mutation argument (unused)
 * @param context - RTK Query mutation context
 * @param context.queryFulfilled - Promise that resolves when mutation succeeds
 *
 * @example
 * ```ts
 * updateRole: build.mutation<RbacRoleSummary, UpdateRoleInput>({
 *   query: ({ id, ...body }) => ({
 *     url: `roles/${id}`,
 *     method: "PATCH",
 *     body,
 *   }),
 *   onQueryStarted: refreshAuthAfterMutation,
 * })
 * ```
 */
export const refreshAuthAfterMutation = async (
  _arg: unknown,
  { queryFulfilled }: { queryFulfilled: Promise<unknown> },
): Promise<void> => {
  try {
    await queryFulfilled;
    emitAuthRefreshRequested();
  } catch {
    // Ignore failed writes.
  }
};
