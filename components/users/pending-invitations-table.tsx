"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconRefresh, IconCopy, IconCheck, IconLoader2 } from "@tabler/icons-react";
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
import { revealInviteLink } from "@/lib/api-client";
import type { InvitationRecord, InvitationStatus } from "@/types/invitation";

interface PendingInvitationsTableProps {
  readonly invitations: readonly InvitationRecord[];
  readonly isLoading?: boolean;
  readonly resendingInvitationId?: string | null;
  readonly onResend: (invitationId: string) => void;
  readonly onSendInvitation?: () => void;
}

const statusVariant: Readonly<
  Record<InvitationStatus, "default" | "secondary" | "outline" | "destructive">
> = {
  pending: "default",
  accepted: "secondary",
  revoked: "outline",
  expired: "destructive",
};

const statusClassName: Readonly<Partial<Record<InvitationStatus, string>>> = {
  accepted: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
};

const statusLabel: Readonly<Record<InvitationStatus, string>> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

function InviteUrlCell({
  invitationId,
  status,
}: {
  readonly invitationId: string;
  readonly status: InvitationStatus;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (status !== "pending") {
    return <span className="text-muted-foreground">—</span>;
  }

  const handleCopy = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { inviteUrl } = await revealInviteLink(invitationId);
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">
        /accept-invite?...
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        disabled={isLoading}
        aria-label="Copy invite link"
      >
        {isLoading ? (
          <IconLoader2 className="size-3.5 animate-spin" />
        ) : copied ? (
          <IconCheck className="size-3.5 text-green-600" />
        ) : (
          <IconCopy className="size-3.5" />
        )}
      </Button>
    </div>
  );
}

export function PendingInvitationsTable({
  invitations,
  isLoading = false,
  resendingInvitationId,
  onResend,
  onSendInvitation,
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
          action={
            onSendInvitation ? (
              <Button onClick={onSendInvitation}>Send Invitation</Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Link</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[160px] text-right">Action</TableHead>
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
                <Badge
                  variant={statusVariant[invitation.status]}
                  className={statusClassName[invitation.status]}
                >
                  {statusLabel[invitation.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <InviteUrlCell
                  invitationId={invitation.id}
                  status={invitation.status}
                />
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
                  <IconRefresh className="size-4" />
                  {isResending ? "Regenerating…" : "Regenerate link"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
