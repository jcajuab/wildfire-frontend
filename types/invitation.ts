export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export interface InvitationRecord {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly status: InvitationStatus;
  readonly expiresAt: string;
  readonly createdAt: string;
  /** Invite URL returned by the backend (available for pending invitations). */
  readonly inviteUrl?: string | null;
}
