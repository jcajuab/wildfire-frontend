"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import {
  IconRefresh,
  IconCopy,
  IconLoader2,
  IconDotsVertical,
  IconFilter,
  IconTrash,
} from "@tabler/icons-react";
import { SortableHeader } from "@/components/common/sortable-header";
import { TableHeaderControl } from "@/components/common/table-header-control";
import { TableEmptyState } from "@/components/common/table-empty-state";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import {
  useDeleteInvitationMutation,
  useRevealInviteLinkMutation,
} from "@/lib/api/invitations-api";
import type {
  InvitationRecord,
  InvitationSort,
  InvitationStatus,
  InvitationStatusFilter,
} from "@/types/invitation";
import { toast } from "sonner";

interface PendingInvitationsTableProps {
  readonly invitations: readonly InvitationRecord[];
  readonly isLoading?: boolean;
  readonly statusFilter?: InvitationStatusFilter;
  readonly sort?: InvitationSort;
  readonly resendingInvitationId?: string | null;
  readonly onStatusFilterChange?: (status: InvitationStatusFilter) => void;
  readonly onSortChange?: (sort: InvitationSort) => void;
  readonly onResend: (invitationId: string) => void;
  readonly onSendInvitation?: () => void;
  readonly emptyState?: {
    readonly title: string;
    readonly description: string;
    readonly action?: ReactElement | null;
  };
}

const statusClassName: Readonly<Record<InvitationStatus, string>> = {
  pending:
    "border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted:
    "border-green-200 bg-green-100 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400",
  revoked:
    "border-border bg-transparent text-muted-foreground hover:bg-transparent",
  expired: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusLabel: Readonly<Record<InvitationStatus, string>> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
};

const statusOptions: readonly {
  readonly value: InvitationStatusFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "revoked", label: "Revoked" },
  { value: "expired", label: "Expired" },
];

function InvitationStatusFilterHeader({
  value,
  onChange,
}: {
  readonly value: InvitationStatusFilter;
  readonly onChange: (status: InvitationStatusFilter) => void;
}): ReactElement {
  const hasActiveFilter = value !== "all";
  const activeLabel = statusOptions.find(
    (option) => option.value === value,
  )?.label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TableHeaderControl aria-label="Filter invitations by status">
          Status
          <IconFilter
            className={
              hasActiveFilter
                ? "size-3.5 text-foreground"
                : "size-3.5 text-muted-foreground"
            }
            aria-hidden="true"
          />
          {hasActiveFilter && activeLabel ? (
            <span className="sr-only">filtered by {activeLabel}</span>
          ) : null}
        </TableHeaderControl>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) =>
            onChange(nextValue as InvitationStatusFilter)
          }
        >
          {statusOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InvitationActionsMenu({
  invitation,
  isResending,
  isDeleting,
  onResend,
  onDelete,
}: {
  readonly invitation: InvitationRecord;
  readonly isResending: boolean;
  readonly isDeleting: boolean;
  readonly onResend: (invitationId: string) => void;
  readonly onDelete: (invitation: InvitationRecord) => void;
}): ReactElement | null {
  const [revealInviteLink] = useRevealInviteLinkMutation();

  const handleCopyLink = async (): Promise<void> => {
    try {
      const { inviteUrl } = await revealInviteLink(invitation.id).unwrap();
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invitation link copied.");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for invitation to ${invitation.email}`}
        >
          <IconDotsVertical className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {invitation.status === "pending" ? (
          <>
            <DropdownMenuItem onSelect={() => void handleCopyLink()}>
              <IconCopy className="size-4" aria-hidden="true" />
              Copy Invite Link
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isResending}
              onSelect={() => onResend(invitation.id)}
            >
              {isResending ? (
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <IconRefresh className="size-4" aria-hidden="true" />
              )}
              {isResending ? "Regenerating..." : "Regenerate Link"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem
          disabled={isDeleting}
          variant="destructive"
          onSelect={() => onDelete(invitation)}
        >
          {isDeleting ? (
            <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <IconTrash className="size-4" aria-hidden="true" />
          )}
          Delete Invitation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PendingInvitationsTable({
  invitations,
  isLoading = false,
  statusFilter = "all",
  sort = { field: "createdAt", direction: "desc" },
  resendingInvitationId,
  onStatusFilterChange,
  onSortChange,
  onResend,
  onSendInvitation,
  emptyState = {
    title: "No invitations yet",
    description:
      "Invitations you send will appear here with status and expiration details.",
    action: onSendInvitation ? (
      <Button onClick={onSendInvitation}>Send Invitation</Button>
    ) : null,
  },
}: PendingInvitationsTableProps): ReactElement {
  const [invitationToDelete, setInvitationToDelete] =
    useState<InvitationRecord | null>(null);
  const [deleteInvitation, { isLoading: isDeletingInvitation }] =
    useDeleteInvitationMutation();

  const handleDeleteInvitation = async (): Promise<void> => {
    if (!invitationToDelete) return;
    await deleteInvitation(invitationToDelete.id).unwrap();
    toast.success("Invitation deleted.");
    setInvitationToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-28 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading invitations…</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead
              aria-sort={
                sort.field === "email"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {onSortChange ? (
                <SortableHeader
                  label="Invitee"
                  field="email"
                  currentSort={sort}
                  onSort={(field, direction) =>
                    onSortChange({ field, direction })
                  }
                />
              ) : (
                "Invitee"
              )}
            </TableHead>
            <TableHead className="w-[160px]">
              {onStatusFilterChange ? (
                <InvitationStatusFilterHeader
                  value={statusFilter}
                  onChange={onStatusFilterChange}
                />
              ) : (
                "Status"
              )}
            </TableHead>
            <TableHead
              className="w-[260px]"
              aria-sort={
                sort.field === "expiresAt"
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
              }
            >
              {onSortChange ? (
                <SortableHeader
                  label="Expires"
                  field="expiresAt"
                  currentSort={sort}
                  onSort={(field, direction) =>
                    onSortChange({ field, direction })
                  }
                />
              ) : (
                "Expires"
              )}
            </TableHead>
            <TableHead className="w-[48px] text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-b">
          {invitations.length === 0 ? (
            <TableEmptyState
              colSpan={4}
              title={emptyState.title}
              description={emptyState.description}
              action={emptyState.action}
            />
          ) : null}
          {invitations.map((invitation) => {
            const isResending = resendingInvitationId === invitation.id;
            const isDeleting =
              isDeletingInvitation && invitationToDelete?.id === invitation.id;
            return (
              <TableRow key={invitation.id} className="h-12">
                <TableCell>
                  <div className="flex min-h-8 min-w-0 flex-col justify-center">
                    <span className="truncate font-medium">
                      {invitation.email}
                    </span>
                    {invitation.name ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {invitation.name}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusClassName[invitation.status]}
                  >
                    {statusLabel[invitation.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(invitation.expiresAt)}
                </TableCell>
                <TableCell className="w-[48px] text-right">
                  <InvitationActionsMenu
                    invitation={invitation}
                    isResending={isResending}
                    isDeleting={isDeleting}
                    onResend={onResend}
                    onDelete={setInvitationToDelete}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ConfirmActionDialog
        open={invitationToDelete != null}
        onOpenChange={(open) => {
          if (!open) setInvitationToDelete(null);
        }}
        title="Delete invitation?"
        description={
          invitationToDelete
            ? `This will permanently delete the invitation for ${invitationToDelete.email}. Pending invite links will stop working.`
            : undefined
        }
        confirmLabel="Delete invitation"
        errorFallback="Failed to delete invitation"
        onConfirm={handleDeleteInvitation}
      />
    </>
  );
}
