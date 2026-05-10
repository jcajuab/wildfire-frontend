import { api } from "@/lib/api/api";
import { applyMutationCacheEffects } from "@/lib/api/cache-side-effects";
import {
  parseApiListResponseSafe,
  parseApiResponseDataSafe,
} from "@/lib/api/contracts";
import { createProvidesTags } from "@/lib/api/provide-tags";
import type {
  InvitationListResponse,
  InvitationRecord,
  InvitationSortField,
  InvitationStatusFilter,
} from "@/types/invitation";

export interface CreateInvitationResponse {
  readonly id: string;
  readonly expiresAt: string;
}

export interface InvitationListQuery {
  readonly q?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly status?: InvitationStatusFilter;
  readonly sortBy?: InvitationSortField;
  readonly sortDirection?: "asc" | "desc";
}

export const invitationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    listInvitations: build.query<
      InvitationListResponse,
      InvitationListQuery | void
    >({
      query: (query) => ({
        url: "auth/invitations",
        params: {
          q: query?.q,
          page: query?.page ?? 1,
          pageSize: query?.pageSize ?? 10,
          status:
            query?.status && query.status !== "all" ? query.status : undefined,
          sortBy: query?.sortBy ?? "createdAt",
          sortDirection: query?.sortDirection ?? "desc",
        },
      }),
      transformResponse: (response) => {
        const parsed = parseApiListResponseSafe<InvitationRecord>(
          response,
          "listInvitations",
        );
        return {
          items: parsed.data,
          total: parsed.meta.total,
          page: parsed.meta.page,
          pageSize: parsed.meta.pageSize,
        };
      },
      providesTags: createProvidesTags("Invitation"),
    }),
    createInvitation: build.mutation<
      CreateInvitationResponse,
      { email: string; name?: string }
    >({
      query: (body) => ({
        url: "auth/invitations",
        method: "POST",
        body,
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<CreateInvitationResponse>(
          response,
          "createInvitation",
        ),
      invalidatesTags: [{ type: "Invitation", id: "LIST" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [
              { type: "Invitation", id: "LIST" },
              { type: "AuditEvent", id: "LIST" },
            ],
            revalidate: ["invitations", "audit"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
    resendInvitation: build.mutation<CreateInvitationResponse, string>({
      query: (id) => ({
        url: `auth/invitations/${id}/resend`,
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<CreateInvitationResponse>(
          response,
          "resendInvitation",
        ),
      invalidatesTags: (_result, _error, id) => [
        { type: "Invitation", id },
        { type: "Invitation", id: "LIST" },
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [
              { type: "Invitation", id },
              { type: "Invitation", id: "LIST" },
              { type: "AuditEvent", id: "LIST" },
            ],
            revalidate: ["invitations", "audit"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
    revealInviteLink: build.mutation<{ inviteUrl: string }, string>({
      query: (id) => ({
        url: `auth/invitations/${encodeURIComponent(id)}/reveal-link`,
        method: "POST",
      }),
      transformResponse: (response) =>
        parseApiResponseDataSafe<{ inviteUrl: string }>(
          response,
          "revealInviteLink",
        ),
      async onQueryStarted(_id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          await applyMutationCacheEffects(dispatch, {
            invalidate: [{ type: "AuditEvent", id: "LIST" }],
            revalidate: ["audit"],
          });
        } catch {
          // mutation failed
        }
      },
    }),
  }),
});

export const {
  useListInvitationsQuery,
  useCreateInvitationMutation,
  useResendInvitationMutation,
  useRevealInviteLinkMutation,
} = invitationsApi;
