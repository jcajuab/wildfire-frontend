"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { IconRefresh, IconCopy, IconCheck } from "@tabler/icons-react";
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

const statusLabel: Readonly<Record<InvitationStatus, string>> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

function InviteUrlCell({
  url,
}: {
  readonly url: string | null | undefined;
}): ReactElement {
  const [copied, setCopied] = useState(false);

  if (!url) {
    return <span className="text-muted-foreground">—</span>;
  }

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show only the path portion truncated for display
  let displayText = url;
  try {
    const parsed = new URL(url);
    displayText = parsed.pathname + parsed.search;
  } catch {
    // keep original
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="max-w-[160px] truncate font-mono text-xs text-muted-foreground"
        title={url}
      >
        {displayText}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={handleCopy}
        aria-label="Copy invite link"
      >
        {copied ? (
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
      <TableHeader>
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
                <Badge variant={statusVariant[invitation.status]}>
                  {statusLabel[invitation.status]}
                </Badge>
              </TableCell>
              <TableCell>
                <InviteUrlCell url={invitation.inviteUrl} />
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
