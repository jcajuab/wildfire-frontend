import type { ReactElement } from "react";
import { IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PendingAction } from "@/hooks/use-ai-chat";

interface PendingActionCardProps {
  readonly action: PendingAction;
  readonly onConfirm: () => void;
  readonly onReject: () => void;
  readonly onCancel: () => void;
}

export function PendingActionCard({
  action,
  onConfirm,
  onReject,
  onCancel,
}: PendingActionCardProps): ReactElement {
  const isDelete = action.actionType === "delete";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {isDelete ? "Delete" : "Edit"} {action.resourceType}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {action.summary}
          </p>
        </div>
        <div className="ml-2 flex shrink-0 gap-1">
          <Button
            size="icon-sm"
            variant={isDelete ? "destructive" : "default"}
            onClick={onConfirm}
            title="Approve"
            aria-label={`Approve ${action.actionType} ${action.resourceType}`}
          >
            <IconCheck className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onReject}
            title="Reject"
            aria-label={`Reject ${action.actionType} ${action.resourceType}`}
          >
            <IconX className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onCancel}
            title="Cancel"
            aria-label={`Cancel ${action.actionType} ${action.resourceType}`}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
