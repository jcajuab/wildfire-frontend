"use client";

import type { ReactElement } from "react";
import { IconMail, IconRefresh } from "@tabler/icons-react";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import type { InvitationRecord, InvitationStatus } from "@/types/invitation";

interface PendingInvitationsTableProps {
  readonly invitations: readonly InvitationRecord[];
  readonly isLoading?: boolean;
  readonly resendingInvitationId?: string | null;
  readonly onResend: (invitationId: string) => void;
}

const statusVariant: Readonly<
  Record<InvitationStatus, "default" | "secondary" | "outline" | "destructive">
> = {
  pending: "default",
  accepted: "secondary",
  revoked: "outline",
  expired: "destructive",
};

const statusLabel: Readonly<Record<InvitationStatus, string>> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

export function PendingInvitationsTable({
  invitations,
  isLoading = false,
  resendingInvitationId,
  onResend,
}: PendingInvitationsTableProps): ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-28 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invitations…</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          title="No invitations yet"
          description="Invitations you send will appear here with status and expiration details."
          icon={<IconMail className="size-7" aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[120px] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => {
          const canResend = invitation.status === "pending";
          const isResending = resendingInvitationId === invitation.id;
          return (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {invitation.name ?? "-"}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant[invitation.status]}>
                  {statusLabel[invitation.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(invitation.expiresAt)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(invitation.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => onResend(invitation.id)}
                  disabled={!canResend || isResending}
                >
                  <IconRefresh className="size-3.5" />
                  {isResending ? "Sending…" : "Resend"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
