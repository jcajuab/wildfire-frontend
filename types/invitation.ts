export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type InvitationStatusFilter = "all" | InvitationStatus;
export type InvitationSortField = "email" | "expiresAt" | "createdAt";

export interface InvitationRecord {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly status: InvitationStatus;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface InvitationSort {
  readonly field: InvitationSortField;
  readonly direction: "asc" | "desc";
}

export interface InvitationListResponse {
  readonly items: readonly InvitationRecord[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
